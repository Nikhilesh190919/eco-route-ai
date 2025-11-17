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
      return [
        { id: 'ai:1', label: `${query} → Boston (train)`, origin: query, destination: 'Boston', source: 'ai', relevanceScore: 30 },
        { id: 'ai:2', label: `${query} → New York (bus)`, origin: query, destination: 'New York', source: 'ai', relevanceScore: 30 }
      ];
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: query }]
    });

    const contentText = response.choices[0].message.content || '';
    const parsed = parseSuggestions(contentText);

    return parsed.map(p => ({
      id: p.id,
      label: p.label,
      origin: p.origin,
      destination: p.destination,
      source: 'ai',
      relevanceScore: 25
    }));
  }
