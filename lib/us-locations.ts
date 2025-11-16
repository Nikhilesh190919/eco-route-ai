/**
 * Static list of US states and major cities for search suggestions
 */

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];

export const MAJOR_CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
  'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville',
  'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
  'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento',
  'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh',
  'Virginia Beach', 'Miami', 'Oakland', 'Minneapolis', 'Tulsa', 'Cleveland',
  'Wichita', 'Arlington', 'Tampa', 'New Orleans'
];

export type USLocation = {
  id: string;
  name: string;
  type: 'state' | 'city';
};

/**
 * Get all US locations (states and cities)
 */
export function getAllUSLocations(): USLocation[] {
  const states: USLocation[] = US_STATES.map((state, idx) => ({
    id: `state-${idx}`,
    name: state,
    type: 'state' as const,
  }));

  const cities: USLocation[] = MAJOR_CITIES.map((city, idx) => ({
    id: `city-${idx}`,
    name: city,
    type: 'city' as const,
  }));

  return [...states, ...cities];
}

/**
 * Filter US locations by query (case-insensitive)
 */
export function filterUSLocations(query: string, limit: number = 10): USLocation[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 1) return [];

  const allLocations = getAllUSLocations();
  const filtered = allLocations.filter((location) =>
    location.name.toLowerCase().includes(q)
  );

  // Sort: exact matches first, then by name
  return filtered
    .sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aExact = aLower === q;
      const bExact = bLower === q;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      if (aLower.startsWith(q) && !bLower.startsWith(q)) return -1;
      if (!aLower.startsWith(q) && bLower.startsWith(q)) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

