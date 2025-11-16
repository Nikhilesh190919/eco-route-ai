"use client";
import { TripSearchBar, type TripSuggestion } from '@/components/TripSearchBar';
import { useState, createContext, useContext, ReactNode } from 'react';

const SuggestionContext = createContext<{
  suggestion: TripSuggestion | null;
  setSuggestion: (s: TripSuggestion | null) => void;
} | null>(null);

export function useSuggestionContext() {
  const context = useContext(SuggestionContext);
  if (!context) throw new Error('useSuggestionContext must be used within HomePageClient');
  return context;
}

export function HomePageClient({ children }: { children?: ReactNode }) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<TripSuggestion | null>(null);

  const handleSelect = (suggestion: TripSuggestion) => {
    setSelectedSuggestion(suggestion);
    // Scroll to trip form
    setTimeout(() => {
      const formElement = document.getElementById('trip-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <SuggestionContext.Provider value={{ suggestion: selectedSuggestion, setSuggestion: setSelectedSuggestion }}>
      {children}
      {selectedSuggestion && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Selected: {selectedSuggestion.label}
              </p>
              {selectedSuggestion.description && (
                <p className="text-xs text-green-700 mt-1">{selectedSuggestion.description}</p>
              )}
              <p className="text-xs text-green-600 mt-1">The form below has been pre-filled. Adjust details and plan your trip!</p>
            </div>
            <button
              onClick={() => setSelectedSuggestion(null)}
              className="text-green-600 hover:text-green-800 transition-colors"
              aria-label="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </SuggestionContext.Provider>
  );
}

