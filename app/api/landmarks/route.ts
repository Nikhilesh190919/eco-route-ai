import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get famous landmarks for a location
 * Returns array of landmark names that can be used for image search
 */
function getLandmarksForLocation(location: string): string[] {
  const locationLower = location.toLowerCase().trim();
  
  // Static landmark mappings for common locations
  const landmarkMap: Record<string, string[]> = {
    // Major US cities
    'new york': ['Statue of Liberty', 'Times Square', 'Central Park'],
    'new york city': ['Statue of Liberty', 'Times Square', 'Central Park'],
    'los angeles': ['Hollywood Sign', 'Santa Monica Pier', 'Griffith Observatory'],
    'san francisco': ['Golden Gate Bridge', 'Alcatraz Island', 'Fisherman\'s Wharf'],
    'chicago': ['Millennium Park', 'Willis Tower', 'Navy Pier'],
    'houston': ['Space Center Houston', 'Museum District', 'Buffalo Bayou'],
    'phoenix': ['Camelback Mountain', 'Desert Botanical Garden', 'Papago Park'],
    'philadelphia': ['Liberty Bell', 'Independence Hall', 'Philadelphia Museum of Art'],
    'san antonio': ['Alamo', 'River Walk', 'Tower of the Americas'],
    'san diego': ['Balboa Park', 'Coronado Beach', 'San Diego Zoo'],
    'dallas': ['Reunion Tower', 'Dallas Arboretum', 'Deep Ellum'],
    'seattle': ['Space Needle', 'Pike Place Market', 'Mount Rainier'],
    'denver': ['Red Rocks Amphitheatre', 'Rocky Mountain National Park', 'Denver Art Museum'],
    'boston': ['Fenway Park', 'Freedom Trail', 'Boston Common'],
    'miami': ['South Beach', 'Everglades', 'Art Deco District'],
    'atlanta': ['Centennial Olympic Park', 'Stone Mountain', 'Georgia Aquarium'],
    'detroit': ['Belle Isle Park', 'Detroit Institute of Arts', 'Motown Museum'],
    'portland': ['Multnomah Falls', 'Powell\'s City of Books', 'Portland Japanese Garden'],
    'las vegas': ['The Strip', 'Hoover Dam', 'Red Rock Canyon'],
    'orlando': ['Disney World', 'Universal Studios', 'Lake Eola'],
    'nashville': ['Grand Ole Opry', 'Country Music Hall of Fame', 'Centennial Park'],
    'minneapolis': ['Minneapolis Sculpture Garden', 'Mall of America', 'Lake Calhoun'],
    'cleveland': ['Rock and Roll Hall of Fame', 'Cleveland Museum of Art', 'West Side Market'],
    'tampa': ['Busch Gardens', 'Tampa Bay', 'Ybor City'],
    'pittsburgh': ['PNC Park', 'Carnegie Science Center', 'Phipps Conservatory'],
    
    // States
    'california': ['Yosemite National Park', 'Big Sur', 'Napa Valley'],
    'texas': ['Alamo', 'Big Bend National Park', 'San Antonio River Walk'],
    'new york': ['Niagara Falls', 'Adirondack Mountains', 'Finger Lakes'],
    'florida': ['Everglades', 'Key West', 'Disney World'],
    'colorado': ['Rocky Mountain National Park', 'Garden of the Gods', 'Aspen'],
    'arizona': ['Grand Canyon', 'Sedona', 'Antelope Canyon'],
    'utah': ['Arches National Park', 'Zion National Park', 'Bryce Canyon'],
    'nevada': ['Hoover Dam', 'Lake Tahoe', 'Valley of Fire'],
    'oregon': ['Crater Lake', 'Columbia River Gorge', 'Cannon Beach'],
    'washington': ['Mount Rainier', 'Space Needle', 'Olympic National Park'],
    'hawaii': ['Waikiki Beach', 'Diamond Head', 'Haleakala'],
    'alaska': ['Denali National Park', 'Glacier Bay', 'Northern Lights'],
  };

  // Check for exact match
  if (landmarkMap[locationLower]) {
    return landmarkMap[locationLower];
  }

  // Check for partial matches
  for (const [key, landmarks] of Object.entries(landmarkMap)) {
    if (locationLower.includes(key) || key.includes(locationLower)) {
      return landmarks;
    }
  }

  // Fallback: generate generic landmarks
  return [
    `${location} Downtown`,
    `${location} City Center`,
    `${location} Historic District`,
  ];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    // Get landmarks (static list or AI-generated)
    let landmarks = getLandmarksForLocation(location);

    // If OpenAI is configured, try to get better landmarks
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-placeholder') {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a travel expert. Generate exactly 3 famous landmarks or attractions for a location. Return only a JSON array of landmark names, no additional text.',
            },
            {
              role: 'user',
              content: `Generate 3 famous landmarks or attractions for "${location}". Return as JSON array: ["Landmark 1", "Landmark 2", "Landmark 3"]`,
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
          timeout: 5000,
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (content) {
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length >= 3) {
              landmarks = parsed.slice(0, 3);
            }
          } catch {
            // Use fallback landmarks
          }
        }
      } catch (error) {
        console.error('OpenAI landmarks error:', error);
        // Use static landmarks
      }
    }

    // Format landmarks with image URLs
    const landmarksWithImages = landmarks.slice(0, 3).map((landmark) => ({
      name: landmark,
      imageUrl: `https://source.unsplash.com/300x200/?${encodeURIComponent(landmark)},landmark,attraction`,
      caption: `Explore: ${landmark}`,
    }));

    return NextResponse.json({ landmarks: landmarksWithImages });
  } catch (error: any) {
    console.error('Landmarks API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch landmarks' },
      { status: 500 }
    );
  }
}

