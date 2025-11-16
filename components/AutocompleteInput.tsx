"use client";
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AutocompleteSuggestion = {
  id: string;
  label: string;
  origin?: string;
  destination?: string;
  type?: 'state' | 'city' | 'route' | 'destination';
  description?: string;
};

type Props = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
};

/**
 * Get emoji icon for suggestion type
 */
function getTypeIcon(type?: string): string {
  switch (type) {
    case 'city':
      return '🌆';
    case 'state':
      return '🌄';
    case 'route':
      return '✈️';
    case 'destination':
      return '📍';
    default:
      return '📍';
  }
}

export function AutocompleteInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  disabled,
  error,
  icon,
}: Props) {
  const [query, setQuery] = useState(value);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query with value prop
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounce query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch suggestions from API
  useEffect(() => {
    let active = true;

    async function fetchSuggestions() {
      if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        setLoading(false);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      
      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(debouncedQuery.trim())}`);
        if (!active) return;

        if (!response.ok) {
          setSuggestions([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (!active) return;

        const fetchedSuggestions: AutocompleteSuggestion[] = (data.suggestions || []).slice(0, 8).map((s: any) => ({
          id: s.id || `suggestion-${Math.random()}`,
          label: s.label || s.name || s.destination || s.origin || '',
          origin: s.origin,
          destination: s.destination,
          type: s.type || 'destination',
          description: s.description,
        }));

        setSuggestions(fetchedSuggestions);
        setIsOpen(fetchedSuggestions.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        if (active) {
          console.error('Failed to fetch suggestions:', err);
          setSuggestions([]);
          setLoading(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchSuggestions();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

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
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    // For routes, prefer destination over origin
    // For destinations, use the destination or label
    // For origin/destination fields, extract the appropriate value
    let valueToSet: string;
    if (suggestion.type === 'route') {
      // For routes, prefer destination, fallback to origin
      valueToSet = suggestion.destination || suggestion.origin || suggestion.label;
    } else {
      // For destinations/cities/states, use destination or label
      valueToSet = suggestion.destination || suggestion.label || suggestion.origin || '';
    }
    onChange(valueToSet);
    setQuery(valueToSet);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    setIsOpen(true); // Show suggestions as user types
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0 && query.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 px-4 py-3 text-base bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors ${
                  index === selectedIndex ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                } ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${
                  index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100 dark:border-gray-700'
                }`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {getTypeIcon(suggestion.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {suggestion.type === 'route' 
                      ? suggestion.label 
                      : (suggestion.destination || suggestion.origin || suggestion.label)}
                  </div>
                  {suggestion.description && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {suggestion.description}
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

