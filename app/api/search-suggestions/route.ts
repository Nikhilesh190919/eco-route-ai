import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { filterUSLocations } from '@/lib/us-locations';

// Simple in-memory rate limiting (per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per IP

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIP || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

function parseSuggestions(text: string): Array<{ id: string; label: string; origin?: string; destination?: string }> {
  const suggestions: Array<{ id: string; label: string; origin?: string; destination?: string }> = [];
  const lines = text.split('\n').filter((line) => line.trim());

  for (const line of lines.slice(0, 5)) {
    // Match patterns like "City A → City B (mode)" or "City A → City B"
    const routeMatch = line.match(/(.+?)\s*→\s*(.+?)(?:\s*\((.+?)\))?$/);
    if (routeMatch) {
      const origin = routeMatch[1].trim();
      const destination = routeMatch[2].trim();
      const mode = routeMatch[3]?.trim();
      const label = mode ? `${origin} → ${destination} (${mode})` : `${origin} → ${destination}`;
      suggestions.push({
        id: `route:${origin}-${destination}-${Date.now()}-${Math.random()}`,
        label,
        origin,
        destination,
      });
    } else {
      // Single city/destination
      const city = line.replace(/^\d+\.\s*/, '').replace(/\s*\(.*?\)$/, '').trim();
      if (city) {
        suggestions.push({
          id: `city:${city}-${Date.now()}-${Math.random()}`,
          label: city,
          destination: city,
        });
      }
    }
  }

  return suggestions;
}

type Suggestion = {
  id: string;
  label: string;
  origin?: string;
  destination?: string;
  source: 'database' | 'ai' | 'static';
  relevanceScore: number;
  description?: string;
};

function normalizeRoute(origin?: string, destination?: string): string {
  const o = (origin || '').toLowerCase().trim();
  const d = (destination || '').toLowerCase().trim();
  if (o && d) return `${o}→${d}`;
  return d || o;
}

function calculateRelevanceScore(
  suggestion: { origin?: string; destination?: string },
  query: string
): number {
  const q = query.toLowerCase().trim();
  const origin = (suggestion.origin || '').toLowerCase();
  const destination = (suggestion.destination || '').toLowerCase();
  
  // Exact match in origin or destination = highest score
  if (origin === q || destination === q) return 100;
  
  // Starts with query = high score
  if (origin.startsWith(q) || destination.startsWith(q)) return 80;
  
  // Contains query = medium score
  if (origin.includes(q) || destination.includes(q)) return 60;
  
  // Partial match = lower score
  const originWords = origin.split(/\s+/);
  const destWords = destination.split(/\s+/);
  const queryWords = q.split(/\s+/);
  
  const hasWordMatch = queryWords.some(
    (qw) => originWords.some((ow) => ow.startsWith(qw)) || 
            destWords.some((dw) => dw.startsWith(qw))
  );
  
  return hasWordMatch ? 40 : 20;
}

function deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Map<string, Suggestion>();
  
  for (const sug of suggestions) {
    const key = normalizeRoute(sug.origin, sug.destination);
    const existing = seen.get(key);
    
    if (!existing) {
      seen.set(key, sug);
    } else {
      // Priority: static > database > AI
      const sourcePriority = { static: 3, database: 2, ai: 1 };
      const existingPriority = sourcePriority[existing.source] || 0;
      const sugPriority = sourcePriority[sug.source] || 0;
      
      if (sugPriority > existingPriority) {
        seen.set(key, sug);
      } else if (sugPriority === existingPriority && sug.relevanceScore > existing.relevanceScore) {
        seen.set(key, sug);
      }
    }
  }
  
  return Array.from(seen.values());
}

async function getDatabaseSuggestions(query: string): Promise<Suggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  
  try {
    // SQLite doesn't support case-insensitive mode, but LIKE is case-insensitive for ASCII
    // For PostgreSQL, we'd use mode: 'insensitive', but for SQLite we'll handle it differently
    const trips = await prisma.trip.findMany({
      where: {
        OR: [
          { origin: { contains: q } },
          { destination: { contains: q } },
        ],
      },
      take: 20, // Get more to allow for deduplication
      orderBy: { createdAt: 'desc' },
    });
    
    // Deduplicate by origin/destination combination
    const seen = new Set<string>();
    const uniqueTrips = trips.filter((trip: { origin: string; destination: string }) => {
      const key = `${trip.origin.toLowerCase()}→${trip.destination.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    return uniqueTrips.slice(0, 10).map((trip: { id: string; origin: string; destination: string }) => {
      const label = `${trip.origin} → ${trip.destination}`;
      const relevanceScore = calculateRelevanceScore(
        { origin: trip.origin, destination: trip.destination },
        q
      );
      
      return {
        id: `db:${trip.id}`,
        label,
        origin: trip.origin,
        destination: trip.destination,
        type: 'route' as const,
        source: 'database',
        relevanceScore,
      };
    });
  } catch (error) {
    console.error('Error fetching database suggestions:', error);
    return [];
  }
}

async function getAISuggestions(query: string): Promise<Suggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'sk-placeholder') {
    // Fallback to mock suggestions
    return [
      {
        id: 'ai:1',
        label: `${query} → Boston (train)`,
        origin: query,
        destination: 'Boston',
        source: 'ai',
        relevanceScore: 30,
      },
      {
        id: 'ai:2',
        label: `${query} → New York (bus)`,
        origin: query,
        destination: 'New York',
        source: 'ai',
        relevanceScore: 30,
      },
    ];
  }
  
  try {
    const openai = new OpenAI({ apiKey });
    
    const prompt = `You are an expert eco-friendly travel planner specializing in sustainable destinations and eco-tourism. Analyze this query: "${query}"

The query could be:
1. A destination/place query (e.g., "eco trips in California", "sustainable destinations in New York", "green travel spots in Texas")
2. A route query (e.g., "New York to Boston", "eco-friendly routes from Seattle")
3. A single city/state name (suggest popular eco-friendly destinations or routes from/to that location)
4. A travel theme (e.g., "national parks", "eco-friendly beaches", "sustainable cities", "green travel destinations")

Generate eco-friendly travel suggestions based on the query type:

FOR DESTINATION/PLACE QUERIES (like "eco trips in California"):
- Return SPECIFIC, well-known eco-friendly destinations, national parks, nature reserves, sustainable travel spots
- For California: Yosemite National Park, Big Sur, Joshua Tree National Park, Napa Valley, Redwood National Park, Sequoia National Park, Lake Tahoe, Channel Islands
- For other states: Return state-specific eco-destinations (national parks, eco-lodges, sustainable cities, nature areas)
- Include destinations that are known for: sustainability, nature conservation, eco-tourism, low environmental impact
- Mix of: national parks, state parks, eco-lodges, sustainable cities, nature reserves, scenic areas

FOR ROUTE QUERIES:
- Suggest eco-friendly travel routes prioritizing train and bus over flights
- Include origin and destination cities
- Mention why the route is sustainable (low CO2, scenic, public transport)

FOR THEME QUERIES:
- Suggest relevant destinations matching the theme
- Prioritize US destinations unless international is explicitly requested

Return your response as a JSON object with this structure:
{
  "suggestions": [
    {
      "type": "destination" | "route",
      "name": "Full destination name (e.g., 'Yosemite National Park', 'Big Sur Coastline') or route label",
      "destination": "Destination city/place (required for all, use exact name)",
      "origin": "Origin city (only for routes, omit for destinations)",
      "mode": "Travel mode (train, bus, flight, etc.) - only for routes",
      "description": "Brief, informative eco-friendly note (1-2 sentences) explaining why this is sustainable. Include: type of destination (national park, eco-lodge, etc.), key sustainability features, why it's eco-friendly."
    }
  ]
}

IMPORTANT RULES:
- For "eco trips in [STATE/LOCATION]": Return 5-8 specific destinations within that location
- For "sustainable [THEME]": Return destinations matching that theme (e.g., "national parks" → specific park names)
- Always use full, proper names (e.g., "Yosemite National Park" not just "Yosemite")
- Prioritize well-known, accessible destinations
- Mix popular and lesser-known sustainable spots
- For destinations, descriptions should highlight: sustainability practices, eco-friendly facilities, nature conservation, low environmental impact
- Return 5-8 suggestions for destination queries, 3-5 for route queries
- Focus on US destinations unless international is explicitly mentioned
- Make descriptions specific and informative (not generic)

Example for "eco trips in California":
{
  "suggestions": [
    {"type": "destination", "name": "Yosemite National Park", "destination": "Yosemite National Park", "description": "Iconic UNESCO World Heritage site with extensive eco-friendly facilities, sustainable shuttle system, and commitment to conservation. Features zero-waste initiatives and renewable energy programs."},
    {"type": "destination", "name": "Big Sur", "destination": "Big Sur", "description": "Stunning coastal wilderness area with eco-lodges, sustainable camping, and protected marine areas. Home to several LEED-certified accommodations and farm-to-table dining."},
    {"type": "destination", "name": "Joshua Tree National Park", "destination": "Joshua Tree National Park", "description": "Desert park perfect for sustainable camping and eco-tourism. Features dark sky preserve status and minimal-impact visitor programs."},
    {"type": "destination", "name": "Redwood National and State Parks", "destination": "Redwood National and State Parks", "description": "Ancient forest ecosystem with carbon-sequestering old-growth redwoods. Offers sustainable trails and eco-friendly visitor centers."},
    {"type": "destination", "name": "Channel Islands National Park", "destination": "Channel Islands National Park", "description": "Marine sanctuary accessible by eco-friendly boat tours. Features pristine ecosystems and sustainable wildlife viewing programs."},
    {"type": "route", "name": "San Francisco → Yosemite (bus)", "origin": "San Francisco", "destination": "Yosemite National Park", "mode": "bus", "description": "Low-carbon bus route connecting urban center to national park. Reduces individual car emissions by up to 75%."}
  ]
}

Return ONLY valid JSON. No markdown, no code blocks, just pure JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert eco-friendly travel planner specializing in sustainable destinations and low-carbon travel routes. Always respond with valid JSON objects. Focus on US destinations unless international travel is explicitly requested.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '';
    
    let jsonData: any;
    try {
      jsonData = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI JSON response:', error);
      return [];
    }

    // Extract suggestions from response
    let suggestions: any[] = [];
    if (jsonData.suggestions && Array.isArray(jsonData.suggestions)) {
      suggestions = jsonData.suggestions;
    } else if (jsonData.routes && Array.isArray(jsonData.routes)) {
      // Fallback for old format
      suggestions = jsonData.routes.map((r: any) => ({
        type: 'route',
        name: r.origin && r.destination ? `${r.origin} → ${r.destination}` : r.destination || r.origin,
        origin: r.origin,
        destination: r.destination,
        mode: r.mode,
        description: r.description,
      }));
    } else if (jsonData.destinations && Array.isArray(jsonData.destinations)) {
      // Fallback for destinations array
      suggestions = jsonData.destinations.map((d: any) => ({
        type: 'destination',
        name: d.name || d.destination,
        destination: d.destination || d.name,
        description: d.description,
      }));
    } else {
      return [];
    }

    // Convert to suggestions format
    // Limit to 8 suggestions to avoid overwhelming the UI
    return suggestions.slice(0, 8).map((s: any, idx: number) => {
      const isRoute = s.type === 'route' || (s.origin && s.destination && s.origin !== s.destination);
      const destination = s.destination || s.name || '';
      const origin = s.origin || '';
      const mode = s.mode || '';
      
      let label: string;
      let suggestionType: 'state' | 'city' | 'route' | 'destination';
      
      if (isRoute && origin && destination) {
        label = mode ? `${origin} → ${destination} (${mode})` : `${origin} → ${destination}`;
        suggestionType = 'route';
      } else {
        label = s.name || destination;
        // For destinations, we can't determine if it's a state or city without more context
        // Default to 'destination' for AI-generated suggestions
        suggestionType = 'destination';
      }
      
      return {
        id: `ai:${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label,
        origin: origin || undefined,
        destination: destination,
        type: suggestionType,
        source: 'ai' as const,
        relevanceScore: calculateRelevanceScore({ origin, destination }, query),
        description: s.description || `Eco-friendly ${isRoute ? 'route' : 'destination'}`,
      };
    });
  } catch (error: any) {
    console.error('Error fetching AI suggestions:', error);
    
    // Enhanced error logging
    if (error?.status === 429) {
      console.error('OpenAI rate limit exceeded');
    } else if (error?.status === 401) {
      console.error('OpenAI authentication failed');
    } else {
      console.error('OpenAI API error:', error.message);
    }
    
    return [];
  }
}

function getStaticSuggestions(query: string): Suggestion[] {
  const q = query.trim();
  if (!q || q.length < 1) return [];

  const locations = filterUSLocations(q, 10);
  
  return locations.map((location, idx) => {
    const relevanceScore = calculateRelevanceScore(
      { origin: location.name, destination: location.name },
      q
    );

    return {
      id: `static-${location.id}`,
      label: location.name,
      origin: location.name,
      destination: location.name,
      type: location.type, // 'state' or 'city'
      source: 'static' as const,
      relevanceScore: relevanceScore + 10, // Boost static results slightly
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    // Rate limiting (only for AI calls, not static)
    const ip = getClientIP(req);
    const shouldFetchAI = q.length >= 2;
    
    if (shouldFetchAI && !checkRateLimit(ip)) {
      // Return static suggestions even if rate limited
      const staticSuggestions = getStaticSuggestions(q);
      const formatted = staticSuggestions.map(({ source, relevanceScore, origin, destination, label, id, type }) => ({
        id,
        label,
        origin: origin || undefined,
        destination: destination || undefined,
        type: type || 'destination',
      }));
      return NextResponse.json({ 
        suggestions: formatted,
        rateLimited: true 
      });
    }

    // Get static suggestions immediately (no API call needed)
    const staticSuggestions = getStaticSuggestions(q);

    // Fetch database and AI suggestions in parallel (only if query is 2+ chars)
    const [dbSuggestions, aiSuggestions] = shouldFetchAI 
      ? await Promise.all([
          getDatabaseSuggestions(q),
          getAISuggestions(q),
        ])
      : [[], []];

    // Merge all suggestions: static, database, and AI
    const allSuggestions = [...staticSuggestions, ...dbSuggestions, ...aiSuggestions];
    const deduplicated = deduplicateSuggestions(allSuggestions);
    
    // Sort by relevance score (highest first), with priority: static > database > AI
    const sorted = deduplicated.sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // If same score, prefer static > database > AI
      const sourcePriority = { static: 3, database: 2, ai: 1 };
      const aPriority = sourcePriority[a.source] || 0;
      const bPriority = sourcePriority[b.source] || 0;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return 0;
    });

    // Format for response (remove internal fields, keep description and type)
    // Determine if suggestion is a route (has both origin and destination that differ) or a destination
    const formatted = sorted.map(({ source, relevanceScore, description, origin, destination, label, id, type }) => {
      const isRoute = origin && destination && origin !== destination;
      // Determine type: use existing type if available, otherwise infer from route/destination
      let suggestionType: 'state' | 'city' | 'route' | 'destination';
      if (type) {
        suggestionType = type as 'state' | 'city' | 'route' | 'destination';
      } else if (isRoute) {
        suggestionType = 'route';
      } else {
        suggestionType = 'destination';
      }
      
      return {
        id,
        label,
        origin: origin || undefined,
        destination: destination || undefined,
        type: suggestionType,
        ...(description && { description }),
      };
    });

    return NextResponse.json({ suggestions: formatted });
  } catch (error: any) {
    console.error('Search suggestions error:', error);

    // Handle OpenAI-specific errors
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'AI service rate limit exceeded. Please try again in a moment.' },
        { status: 503 }
      );
    }

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'AI service authentication failed. Please check configuration.' },
        { status: 503 }
      );
    }

    // Fallback to empty suggestions on other errors (graceful degradation)
    // This allows the app to continue working even if AI suggestions fail
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}


