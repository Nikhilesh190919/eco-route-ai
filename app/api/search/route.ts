import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { filterUSLocations } from '@/lib/us-locations';

// Simple in-memory rate limiting (per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // Max 15 requests per minute per IP

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

async function getAISuggestions(query: string): Promise<Array<{ id: string; label: string; destination?: string; origin?: string; type: 'destination' | 'route'; description?: string }>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'sk-placeholder') {
    // Fallback suggestions when API key is not configured
    return [
      {
        id: `fallback-${Date.now()}-1`,
        label: query + ' (California)',
        destination: query + ', California',
        type: 'destination',
        description: 'Popular destination',
      },
    ];
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `You are a travel assistant. Given the search query "${query}", suggest 5-8 popular travel destinations or routes that match. 

Return ONLY a JSON array of objects, each with:
- "label": A short, user-friendly name (e.g., "New York", "Los Angeles", "San Francisco → Seattle")
- "destination": The destination city/state (if it's a destination)
- "origin" and "destination": If it's a route (e.g., "San Francisco → Seattle")
- "type": Either "destination" or "route"
- "description": A brief one-line description (optional)

Examples:
[
  {"label": "New York", "destination": "New York, NY", "type": "destination", "description": "The Big Apple"},
  {"label": "San Francisco → Seattle", "origin": "San Francisco, CA", "destination": "Seattle, WA", "type": "route", "description": "West Coast scenic route"}
]

Return ONLY valid JSON, no other text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful travel assistant that returns only valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return [];
    }

    // Try to parse JSON from the response
    let parsed;
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // If JSON parsing fails, try to extract suggestions from text
      const lines = content.split('\n').filter((line) => line.trim());
      parsed = lines.slice(0, 8).map((line, idx) => ({
        id: `ai-${Date.now()}-${idx}`,
        label: line.replace(/^[-*]\s*/, '').trim(),
        destination: line.replace(/^[-*]\s*/, '').trim(),
        type: 'destination' as const,
      }));
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .slice(0, 8)
      .map((item: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        label: item.label || item.destination || String(item),
        destination: item.destination || (item.type === 'destination' ? item.label : undefined),
        origin: item.origin,
        type: item.type || 'destination',
        description: item.description,
      }))
      .filter((item: any) => item.label);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Check rate limiting
    const ip = getClientIP(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const suggestions: Array<{ id: string; label: string; destination?: string; origin?: string; type: 'destination' | 'route'; description?: string }> = [];

    // 1. Get static US locations that match
    const staticLocations = filterUSLocations(q, 5);

    staticLocations.forEach(loc => {
      const name = typeof loc === "string" ? loc : loc.name;

      suggestions.push({
        id: `static-${name.toLowerCase().replace(/\s+/g, "-")}`,
        label: name,
        destination: name,
        type: "destination",
        description: "Popular destination",
      });
    });
    // Deduplicate by label
    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      const key = s.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: static first, then AI
    unique.sort((a, b) => {
      const aIsStatic = a.id.startsWith('static-');
      const bIsStatic = b.id.startsWith('static-');
      if (aIsStatic && !bIsStatic) return -1;
      if (!aIsStatic && bIsStatic) return 1;
      return 0;
    });

    return NextResponse.json({
      suggestions: unique.slice(0, 10),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

