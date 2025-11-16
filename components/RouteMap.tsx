"use client";
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

type Props = {
  origin: string;
  destination: string;
};

// Note: Leaflet CSS is loaded via dynamic import in useEffect

/**
 * Estimate coordinates for a location (state/city name)
 * In production, use a geocoding API like Google Maps Geocoding API
 */
function estimateCoordinates(location: string): [number, number] {
  // Simple hash-based estimation for US locations
  // This is a placeholder - in production, use proper geocoding
  const locationLower = location.toLowerCase().trim();
  
  // Common US state/city coordinates (approximate center points)
  const knownLocations: Record<string, [number, number]> = {
    // States
    'texas': [31.9686, -99.9018],
    'california': [36.1162, -119.6816],
    'new york': [42.1657, -74.9481],
    'florida': [27.7663, -81.6868],
    'illinois': [40.3495, -88.9861],
    'pennsylvania': [40.5908, -77.2098],
    'ohio': [40.3888, -82.7649],
    'georgia': [32.1656, -82.9001],
    'north carolina': [35.5397, -79.8431],
    'michigan': [43.3266, -84.5361],
    'new jersey': [40.2989, -74.5210],
    'virginia': [37.7693, -78.1697],
    'washington': [47.4009, -121.4905],
    'arizona': [34.0489, -111.0937],
    'massachusetts': [42.2302, -71.5301],
    'tennessee': [35.7478, -86.6923],
    'indiana': [39.8494, -86.2583],
    'missouri': [38.5729, -92.1893],
    'maryland': [39.0639, -76.8021],
    'wisconsin': [44.2685, -89.6165],
    'colorado': [39.0598, -105.3111],
    'minnesota': [46.2800, -94.3053],
    'south carolina': [33.8569, -80.9450],
    'alabama': [32.8067, -86.7911],
    'louisiana': [31.1695, -91.8678],
    'kentucky': [37.6681, -84.6701],
    'oregon': [44.5720, -122.0709],
    'oklahoma': [35.5653, -96.9289],
    'connecticut': [41.767, -72.677],
    'utah': [40.1500, -111.8624],
    'iowa': [42.0115, -93.2105],
    'nevada': [38.3135, -117.0554],
    'arkansas': [34.9697, -92.3731],
    'mississippi': [32.7673, -89.6812],
    'kansas': [38.5266, -96.7265],
    'new mexico': [34.8405, -106.2485],
    'nebraska': [41.1254, -98.2681],
    'west virginia': [38.3498, -81.6326],
    'idaho': [44.2405, -114.4788],
    'hawaii': [21.3089, -157.8262],
    'new hampshire': [43.4525, -71.5639],
    'maine': [44.3235, -69.7653],
    'rhode island': [41.6809, -71.5118],
    'montana': [46.9219, -110.4544],
    'delaware': [39.3185, -75.5071],
    'south dakota': [44.2998, -99.4388],
    'north dakota': [47.5289, -99.7840],
    'alaska': [61.3707, -152.4044],
    'vermont': [44.2664, -72.5765],
    'wyoming': [42.7559, -107.3025],
    
    // Major cities
    'san francisco': [37.7749, -122.4194],
    'los angeles': [34.0522, -118.2437],
    'new york city': [40.7128, -74.0060],
    'new york, ny': [40.7128, -74.0060],
    'chicago': [41.8781, -87.6298],
    'houston': [29.7604, -95.3698],
    'phoenix': [33.4484, -112.0740],
    'philadelphia': [39.9526, -75.1652],
    'san antonio': [29.4241, -98.4936],
    'san diego': [32.7157, -117.1611],
    'dallas': [32.7767, -96.7970],
    'san jose': [37.3382, -121.8863],
    'austin': [30.2672, -97.7431],
    'jacksonville': [30.3322, -81.6557],
    'seattle': [47.6062, -122.3321],
    'denver': [39.7392, -104.9903],
    'boston': [42.3601, -71.0589],
    'miami': [25.7617, -80.1918],
    'atlanta': [33.7490, -84.3880],
    'detroit': [42.3314, -83.0458],
    'portland': [45.5152, -122.6784],
    'las vegas': [36.1699, -115.1398],
    'orlando': [28.5383, -81.3792],
    'nashville': [36.1627, -86.7816],
    'minneapolis': [44.9778, -93.2650],
    'cleveland': [41.4993, -81.6944],
    'tampa': [27.9506, -82.4572],
    'pittsburgh': [40.4406, -79.9959],
    'cincinnati': [39.1031, -84.5120],
    'kansas city': [39.0997, -94.5786],
    'sacramento': [38.5816, -121.4944],
    'milwaukee': [43.0389, -87.9065],
    'raleigh': [35.7796, -78.6382],
    'indianapolis': [39.7684, -86.1581],
    'columbus': [39.9612, -82.9988],
    'charlotte': [35.2271, -80.8431],
    'virginia beach': [36.8529, -75.9780],
    'san francisco, ca': [37.7749, -122.4194],
    'los angeles, ca': [34.0522, -118.2437],
  };

  // Check for exact match first
  if (knownLocations[locationLower]) {
    return knownLocations[locationLower];
  }

  // Check for partial matches
  for (const [key, coords] of Object.entries(knownLocations)) {
    if (locationLower.includes(key) || key.includes(locationLower)) {
      return coords;
    }
  }

  // Fallback: hash-based estimation (approximate center of US)
  const seed = locationLower.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const lat = 39.8283 + ((seed % 200) - 100) / 10; // 30-50 N
  const lng = -98.5795 + ((seed % 300) - 150) / 10; // -120 to -75 W
  return [lat, lng];
}

/**
 * Calculate center point between two coordinates
 */
function getCenterPoint(coord1: [number, number], coord2: [number, number]): [number, number] {
  return [
    (coord1[0] + coord2[0]) / 2,
    (coord1[1] + coord2[1]) / 2,
  ];
}

/**
 * Calculate zoom level based on distance
 */
function calculateZoom(coord1: [number, number], coord2: [number, number]): number {
  // Simple distance calculation (rough approximation)
  const latDiff = Math.abs(coord1[0] - coord2[0]);
  const lngDiff = Math.abs(coord1[1] - coord2[1]);
  const maxDiff = Math.max(latDiff, lngDiff);
  
  if (maxDiff > 10) return 4; // Very far (cross-country)
  if (maxDiff > 5) return 5;
  if (maxDiff > 2) return 6;
  if (maxDiff > 1) return 7;
  if (maxDiff > 0.5) return 8;
  return 9; // Close locations
}

export function RouteMap({ origin, destination }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load Leaflet CSS dynamically
    import('leaflet/dist/leaflet.css');
  }, []);

  const mapData = useMemo(() => {
    const originCoords = estimateCoordinates(origin);
    const destCoords = estimateCoordinates(destination);
    const center = getCenterPoint(originCoords, destCoords);
    const zoom = calculateZoom(originCoords, destCoords);
    
    return {
      originCoords,
      destCoords,
      center,
      zoom,
      polyline: [originCoords, destCoords] as [number, number][],
    };
  }, [origin, destination]);

  // Don't render map on server side
  if (!isClient) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md p-4 sm:p-6"
      >
        <div className="h-64 sm:h-80 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow duration-300 p-4 sm:p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Route Map
      </h3>
      <div className="relative h-64 sm:h-80 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {isClient && (
          <MapContainer
            center={mapData.center}
            zoom={mapData.zoom}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            scrollWheelZoom={false}
            className="rounded-lg"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Origin Marker */}
            <Marker position={mapData.originCoords}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-emerald-600">Origin</p>
                  <p className="text-sm">{origin}</p>
                </div>
              </Popup>
            </Marker>
            {/* Destination Marker */}
            <Marker position={mapData.destCoords}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-red-600">Destination</p>
                  <p className="text-sm">{destination}</p>
                </div>
              </Popup>
            </Marker>
            {/* Route Polyline - Green travel theme */}
            <Polyline
              positions={mapData.polyline}
              pathOptions={{
                color: '#10b981', // emerald-500 (green travel theme)
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 10',
              }}
            />
          </MapContainer>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
        Approximate route between {origin} and {destination}
      </p>
    </motion.div>
  );
}

