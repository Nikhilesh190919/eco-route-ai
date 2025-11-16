"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type TripSuggestion = {
  id: string;
  label: string;
  origin?: string;
  destination?: string;
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
  onSelect?: (s: TripSuggestion) => void;
  className?: string;
};

export function TripSearchBar({ onSelect, className }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setDebounced(query.trim()), 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!debounced || debounced.length < 2) {
        setSuggestions([]);
        setLoading(false);
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
          setSuggestions([]);
          setOpen(true);
          return;
        }
        
        const formatted = (data.suggestions || []).map((s) => ({
          id: s.id,
          label: s.label,
          origin: s.origin,
          destination: s.destination,
          description: s.description,
        }));
        
        setSuggestions(formatted);
        setOpen(true);
      } catch (e: any) {
        if (!active) return;
        setError('Network error. Please try again.');
        setSuggestions([]);
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

  const handleSelect = (s: TripSuggestion) => {
    if (onSelect) {
      onSelect(s);
    } else {
      // Default: navigate to home with pre-filled form or create trip
      router.push('/');
    }
    setQuery(s.label);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          className="w-full pl-10 pr-4 py-3 sm:py-4 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 text-base sm:text-lg transition-all"
          placeholder="Search for destinations or routes (e.g., 'New York to Paris' or 'eco-friendly routes')"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(!!e.target.value); }}
          onFocus={() => setOpen(!!query)}
          onKeyDown={handleKeyDown}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Finding AI-powered recommendations...</span>
            </div>
          )}
          {!loading && error && (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && suggestions.length === 0 && query && (
            <div className="px-4 py-3 text-sm text-gray-600">
              No recommendations found. Try searching for cities or routes.
            </div>
          )}
          {!loading && !error && suggestions.length > 0 && (
            <div className="max-h-80 overflow-auto">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Recommendations</p>
              </div>
              <ul>
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(s)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{s.label}</div>
                          {s.description && (
                            <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

