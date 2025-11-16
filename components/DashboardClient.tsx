"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SearchBar, type SearchSuggestion } from '@/components/SearchBar';
import { EcoScoreBadge } from '@/components/EcoScoreBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RouteOption, Trip, RouteMode } from '@/types/routes';
import { motion } from 'framer-motion';

type TripItem = Trip & {
  options: RouteOption[]; // Map from routeOptions for backward compatibility
};

/**
 * Get icon for travel mode
 */
function getModeIcon(mode: string | RouteMode) {
  const modeLower = mode.toLowerCase();
  if (modeLower.includes('train')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    );
  }
  if (modeLower.includes('bus')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8m-8 0H6a2 2 0 00-2 2v9a2 2 0 002 2h2m8-11h2a2 2 0 012 2v9a2 2 0 01-2 2h-2m-4-4v2m0-4v2m4 0v2m0-4v2" />
      </svg>
    );
  }
  if (modeLower.includes('flight') || modeLower.includes('airplane') || modeLower.includes('plane')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  }
  if (modeLower.includes('car')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (modeLower.includes('ferry') || modeLower.includes('boat') || modeLower.includes('ship')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    );
  }
  // Default route icon
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Get unique modes from options
 */
function getUniqueModes(options: RouteOption[]): string[] {
  const modes = new Set<string>();
  options.forEach(opt => {
    // Handle combination modes (e.g., "train+bus")
    const primaryMode = opt.mode.split('+')[0].trim().toLowerCase();
    modes.add(primaryMode);
  });
  return Array.from(modes);
}

type SortOption = 'date' | 'budget' | 'ecoScore';
type SortDirection = 'asc' | 'desc';

// Sort options for trips
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date', label: 'Latest' },
  { value: 'ecoScore', label: 'Highest Eco-Score' },
];

export function DashboardClient({ trips }: { trips: TripItem[] }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Debounce query for faux loading UX
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Get unique origins and destinations for filter dropdowns
  const uniqueOrigins = useMemo(() => {
    const origins = new Set(trips.map(t => t.origin));
    return Array.from(origins).sort();
  }, [trips]);

  const uniqueDestinations = useMemo(() => {
    const destinations = new Set(trips.map(t => t.destination));
    return Array.from(destinations).sort();
  }, [trips]);

  // Helper function to get best eco-score from trip options
  const getBestEcoScore = (trip: TripItem): number => {
    const opts = trip.options ?? [];
    if (opts.length === 0) return 0;
    const scores = opts.map(opt => opt.ecoScore ?? 0).filter(score => score > 0);
    if (scores.length === 0) return 0;
    return Math.max(...scores);
  };

  // Filter and sort trips
  const filteredAndSorted = useMemo(() => {
    let result = [...trips];

    // Apply search query filter
    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((t) =>
        t.origin.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q)
      );
    }

    // Apply origin filter
    if (filterOrigin) {
      result = result.filter((t) =>
        t.origin.toLowerCase().includes(filterOrigin.toLowerCase())
      );
    }

    // Apply destination filter
    if (filterDestination) {
      result = result.filter((t) =>
        t.destination.toLowerCase().includes(filterDestination.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          // Sort by latest (most recent first)
          comparison = new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime();
          break;
        case 'budget':
          comparison = a.budget - b.budget;
          break;
        case 'ecoScore':
          // Sort by highest eco-score first
          comparison = getBestEcoScore(b) - getBestEcoScore(a);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [trips, debouncedQuery, filterOrigin, filterDestination, sortBy, sortDirection]);

  const onSelectSuggestion = (s: SearchSuggestion) => {
    // Extract search value from suggestion
    const searchValue = s.destination || s.origin || s.label;
    // Set query to trigger immediate filtering
    setQuery(searchValue);
    // Ensure debounced query updates immediately for instant results
    setDebouncedQuery(searchValue);
  };

  return (
    <div className="space-y-4">
      {/* Live Search Bar Section */}
      <div className="card p-4 sm:p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border-2 border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-primary dark:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Search</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">Search destinations, states, or get AI-powered travel ideas</p>
            </div>
          </div>
          <div className="relative">
            <SearchBar 
              placeholder="Type to search destinations, states, or get AI travel ideas…" 
              onSelect={onSelectSuggestion} 
              className="w-full"
            />
            {query && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Searching for: <strong className="text-gray-700 dark:text-gray-300">{query}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Results Section */}
      {query && (
        <div className="space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-4 px-4 bg-gray-50 rounded-lg">
              <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Filtering trips…</span>
            </div>
          )}

          {!loading && filteredAndSorted.length === 0 && trips.length > 0 && (
            <div className="card p-6 text-center bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No trips match your filters</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Try adjusting your search, origin, or destination filters</p>
              </div>
            </div>
          )}

          {!loading && filteredAndSorted.length > 0 && trips.length > filteredAndSorted.length && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>
                Showing <strong className="text-gray-900">{filteredAndSorted.length}</strong> of <strong className="text-gray-900">{trips.length}</strong> {trips.length === 1 ? 'trip' : 'trips'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters and Sorting Controls */}
      <div className="card p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Filters Section */}
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Origin Filter */}
              <div className="flex-1 sm:flex-none sm:w-48">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Filter by Origin
                </label>
                <select
                  value={filterOrigin}
                  onChange={(e) => setFilterOrigin(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Origins</option>
                  {uniqueOrigins.map((origin) => (
                    <option key={origin} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Filter */}
              <div className="flex-1 sm:flex-none sm:w-48">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Filter by Destination
                </label>
                <select
                  value={filterDestination}
                  onChange={(e) => setFilterDestination(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Destinations</option>
                  {uniqueDestinations.map((destination) => (
                    <option key={destination} value={destination}>
                      {destination}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sorting Section */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Sort By - Simplified to Latest and Highest Eco-Score */}
            <div className="flex-1 sm:flex-none sm:w-48">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  const newSort = e.target.value as SortOption;
                  setSortBy(newSort);
                  // Set appropriate default direction for each sort type
                  if (newSort === 'date') {
                    setSortDirection('desc'); // Latest first
                  } else if (newSort === 'ecoScore') {
                    setSortDirection('desc'); // Highest first
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 dark:text-gray-100"
              >
                <option value="date">Latest</option>
                <option value="ecoScore">Highest Eco-Score</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(filterOrigin || filterDestination || query) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterOrigin('');
                    setFilterDestination('');
                    setQuery('');
                    setDebouncedQuery('');
                  }}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trip Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredAndSorted.map((t, index) => {
          const opts = t.options ?? [];
          
          // If no options, show EmptyState instead of computations
          if (opts.length === 0) {
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative bg-white dark:bg-gray-800 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Card Header with Green/Blue Gradient */}
                <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-emerald-50 dark:from-emerald-900/30 dark:via-blue-900/20 dark:to-emerald-900/30 p-5 border-b border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate mb-2">
                        {t.origin} → {t.destination}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Budget Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>${t.budget}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-6">
                  <EmptyState
                    title="No routes yet"
                    description="This trip doesn't have route options yet."
                    ctaLabel="Plan Routes"
                    ctaHref={`/trip/${t.id}`}
                    icon={
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    }
                  />
                </div>
              </motion.div>
            );
          }

          // Safely compute best/worst route options
          const sorted = [...opts].sort((a, b) => {
            const aK = typeof a?.co2Kg === 'number' ? a.co2Kg : Number.POSITIVE_INFINITY;
            const bK = typeof b?.co2Kg === 'number' ? b.co2Kg : Number.POSITIVE_INFINITY;
            return aK - bK;
          });
          const best = sorted[0];
          const worst = sorted[sorted.length - 1];
          const uniqueModes = getUniqueModes(opts);
          
          // Safely compute CO2 savings with fallbacks
          const bestCo2 = typeof best?.co2Kg === 'number' ? best.co2Kg : 0;
          const worstCo2 = typeof worst?.co2Kg === 'number' ? worst.co2Kg : 0;
          const co2Savings = worstCo2 - bestCo2;
          const co2SavingsPercent = worstCo2 > 0 ? Math.round((co2Savings / worstCo2) * 100) : 0;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group relative bg-white dark:bg-gray-800 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Card Header with Green/Blue Gradient */}
              <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-emerald-50 dark:from-emerald-900/30 dark:via-blue-900/20 dark:to-emerald-900/30 p-5 border-b border-emerald-200 dark:border-emerald-700">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate mb-2">
                      {t.origin} → {t.destination}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Budget Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>${t.budget}</span>
                      </div>
                      {/* EcoScore Badge */}
                      {best && (
                        <div className="flex items-center gap-2">
                          <EcoScoreBadge score={best.ecoScore ?? 0} size={32} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-4">
                {/* Travel Modes */}
                {uniqueModes.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Modes:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {uniqueModes.slice(0, 4).map((mode, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300"
                          title={mode}
                        >
                          <span className="text-primary dark:text-emerald-400">{getModeIcon(mode)}</span>
                          <span className="capitalize">{mode}</span>
                        </div>
                      ))}
                      {uniqueModes.length > 4 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">+{uniqueModes.length - 4} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* CO2 Comparison */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">CO₂ Emissions</span>
                    {co2Savings > 0 && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                        Save {co2SavingsPercent}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {/* Best Option */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Best</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {typeof best?.co2Kg === 'number' ? `${best.co2Kg.toFixed(1)} kg` : 'N/A'}
                      </span>
                    </div>
                    {/* Worst Option */}
                    {worst?.id !== best?.id && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Worst</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {typeof worst?.co2Kg === 'number' ? `${worst.co2Kg.toFixed(1)} kg` : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* CO2 Bar Visualization */}
                  {worst?.id !== best?.id && worstCo2 > 0 && bestCo2 > 0 && (
                    <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-red-500"
                        style={{ width: '100%' }}
                      />
                      <div className="relative -mt-2 flex justify-between">
                        <div
                          className="w-0.5 h-2 bg-green-600"
                          style={{ marginLeft: `${(bestCo2 / worstCo2) * 100}%` }}
                        />
                        {worst?.id !== best?.id && (
                          <div className="w-0.5 h-2 bg-red-600" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Trip Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Duration</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {best?.durationMins != null ? formatDuration(best.durationMins) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Cost</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {best?.cost != null ? `$${best.cost.toFixed(0)}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 pb-5 pt-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
                <Link
                  href={`/trip/${t.id}`}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <span>View Details</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State - No Trips */}
      {filteredAndSorted.length === 0 && !query && !filterOrigin && !filterDestination && (
        <div className="card p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No trips yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Start planning your sustainable journey</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary dark:bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-primary/90 dark:hover:bg-emerald-700 transition-colors"
              >
                <span>Plan Your First Trip</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


