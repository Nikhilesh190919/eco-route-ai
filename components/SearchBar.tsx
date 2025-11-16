"use client";
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { filterUSLocations, type USLocation } from '@/lib/us-locations';

export type SearchSuggestion = {
  id: string;
  label: string;
  origin?: string;
  destination?: string;
  type?: 'static' | 'ai';
  description?: string;
};

type APIResponse = {
  suggestions: Array<{
    id: string;
    label: string;
    origin?: string;
    destination?: string;
    description?: string;
  }>;
};

type Props = {
  placeholder?: string;
  onSelect: (s: SearchSuggestion) => void;
  className?: string;
};

/**
 * Highlights matched text in a string by wrapping matches in <strong> tags
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === query.trim().toLowerCase()) {
      return <strong key={index} className="font-bold text-gray-900">{part}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function SearchBar({ 
  placeholder = 'Search destinations, routes, or get AI travel ideas…', 
  onSelect, 
  className 
}: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState<SearchSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter static US locations based on query (for immediate display)
  const staticLocations = useMemo(() => {
    if (!query.trim()) return [];
    return filterUSLocations(query.trim(), 10);
  }, [query]);

  // Convert US locations to SearchSuggestion format
  const localStaticSuggestions = useMemo(() => {
    return staticLocations.map((location) => ({
      id: location.id,
      label: location.name,
      origin: location.name,
      type: 'static' as const,
    }));
  }, [staticLocations]);

  // Separate static and AI suggestions from API response
  const staticSuggestions = useMemo(() => {
    // Prefer API static suggestions (which may include database matches), fallback to local
    const apiStatic = apiSuggestions.filter(s => s.type === 'static');
    return apiStatic.length > 0 ? apiStatic : localStaticSuggestions;
  }, [apiSuggestions, localStaticSuggestions]);

  const aiSuggestions = useMemo(() => {
    return apiSuggestions.filter(s => s.type === 'ai').slice(0, 3);
  }, [apiSuggestions]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setDebounced(query.trim()), 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!debounced || debounced.length < 2) {
        setApiSuggestions([]);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(debounced)}`);
        const data: APIResponse = await res.json();
        if (!active) return;
        
        if (!res.ok) {
          setError(data.error || 'Failed to fetch suggestions');
          setApiSuggestions([]);
          setOpen(true);
          return;
        }
        
        // Map API suggestions to SearchSuggestion format
        const mappedSuggestions = (data.suggestions || []).map((s: any) => ({
          id: s.id,
          label: s.label,
          origin: s.origin,
          destination: s.destination,
          type: (s.type || 'ai') as 'static' | 'ai',
          description: s.description,
        }));
        
        setApiSuggestions(mappedSuggestions);
        setOpen(true);
      } catch (e: any) {
        if (!active) return;
        setError('Network error. Please try again.');
        setApiSuggestions([]);
        setOpen(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => { active = false; };
  }, [debounced]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const onPick = (s: SearchSuggestion) => {
    // Set the query to trigger search
    const searchValue = s.destination || s.origin || s.label;
    setQuery(searchValue);
    // Call onSelect to notify parent component
    onSelect(s);
    setOpen(false);
  };

  const hasResults = staticSuggestions.length > 0 || aiSuggestions.length > 0;
  const showResults = query.trim().length > 0 && (hasResults || loading || (query.trim().length >= 2 && !error));

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 text-base transition-all placeholder:text-gray-400"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { 
            setQuery(e.target.value); 
            setOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => setOpen(query.trim().length > 0)}
        />
      </div>
      {open && showResults && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden backdrop-blur-sm">
          {/* Loading state */}
          {loading && aiSuggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2 bg-gray-50">
              <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating AI travel ideas...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
          )}

          {/* No results message - only show when query is long enough and we've checked */}
          {!loading && !error && !hasResults && query.trim().length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50">No results found</div>
          )}
          
          {/* Show message when query is too short for AI but no static matches */}
          {!loading && !error && !hasResults && query.trim().length > 0 && query.trim().length < 2 && (
            <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50">Type at least 2 characters for AI travel ideas</div>
          )}

          {hasResults && (
            <div className="max-h-80 sm:max-h-96 overflow-auto">
              {/* Popular States & Cities Section */}
              {staticSuggestions.length > 0 && (
                <>
                  <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Popular States & Cities</p>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {staticSuggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => onPick(s)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation focus:outline-none focus:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-gray-900 flex-1">{highlightText(s.label, query)}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* AI Travel Ideas Section */}
              {aiSuggestions.length > 0 && (
                <>
                  {staticSuggestions.length > 0 && (
                    <div className="border-t-2 border-gray-200"></div>
                  )}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/20 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">AI Travel Ideas</p>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {aiSuggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => onPick(s)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-primary/5 active:bg-primary/10 transition-colors touch-manipulation focus:outline-none focus:bg-primary/5"
                        >
                          <div className="flex items-start gap-3">
                            <svg className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-900">{highlightText(s.label, query)}</div>
                              {s.description && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{s.description}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


