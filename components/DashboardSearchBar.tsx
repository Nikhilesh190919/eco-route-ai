"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type SearchSuggestion = {
  id: string;
  label: string;
  destination?: string;
  origin?: string;
  type?: 'state' | 'city' | 'route' | 'destination';
  description?: string;
};

type APIResponse = {
  suggestions: SearchSuggestion[];
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
      return <strong key={index} className="font-semibold text-emerald-700 dark:text-emerald-400">{part}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function DashboardSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query (300ms as requested)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch suggestions
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    fetch(`/api/search-suggestions?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: APIResponse) => {
        // Map API response to component format
        const mappedSuggestions = (data.suggestions || []).map((sug) => {
          // Use type from API if available, otherwise infer
          let suggestionType: 'state' | 'city' | 'route' | 'destination' = 'destination';
          if (sug.type) {
            suggestionType = sug.type as 'state' | 'city' | 'route' | 'destination';
          } else {
            // Fallback: determine type from origin/destination
            const isRoute = sug.origin && sug.destination && sug.origin !== sug.destination;
            suggestionType = isRoute ? 'route' : 'destination';
          }
          return {
            ...sug,
            type: suggestionType,
          };
        });
        setSuggestions(mappedSuggestions);
        setSelectedIndex(-1);
      })
      .catch((error) => {
        console.error('Search error:', error);
        setSuggestions([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.label);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Navigate to home page with pre-filled destination
    if (suggestion.destination || suggestion.type === 'destination' || suggestion.type === 'city' || suggestion.type === 'state') {
      const destination = suggestion.destination || suggestion.label;
      router.push(`/?destination=${encodeURIComponent(destination)}`);
    } else if (suggestion.origin && suggestion.destination) {
      // Route suggestion
      router.push(`/?origin=${encodeURIComponent(suggestion.origin)}&destination=${encodeURIComponent(suggestion.destination)}`);
    }
  }, [router]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, selectedIndex, handleSelect]);

  const handlePlanTrip = () => {
    if (!query.trim()) return;
    router.push(`/?destination=${encodeURIComponent(query)}`);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search destinations or routes (e.g., California, New York, Seattle…)"
          className="w-full pl-12 pr-32 py-3.5 sm:py-4 text-base sm:text-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm hover:shadow-md dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          <button
            onClick={handlePlanTrip}
            disabled={!query.trim()}
            className="px-4 sm:px-6 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 active:bg-emerald-800 dark:active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
          >
            Plan Trip
          </button>
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (isLoading || suggestions.length > 0 || (debouncedQuery.length >= 1 && !isLoading)) && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Searching...</span>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => {
                // Get icon based on type
                const getIcon = () => {
                  switch (suggestion.type) {
                    case 'city':
                      return '🏙️';
                    case 'state':
                      return '🌄';
                    case 'route':
                      return '✈️';
                    case 'destination':
                    default:
                      return '📍';
                  }
                };

                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelect(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left flex items-center gap-2 p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 rounded-md cursor-pointer transition-colors ${
                      index === selectedIndex ? 'bg-emerald-100 dark:bg-emerald-800/30' : ''
                    }`}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    <span className="text-lg flex-shrink-0" aria-hidden="true">
                      {getIcon()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {highlightText(suggestion.label, debouncedQuery)}
                      </div>
                      {suggestion.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : debouncedQuery.length >= 1 ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No suggestions found. Try a different search term.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

