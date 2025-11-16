"use client";
import { TripSearchBar } from '@/components/TripSearchBar';
import { useSuggestionContext } from '@/components/HomePageClient';

export function TripSearchBarWrapper() {
  const { setSuggestion } = useSuggestionContext();
  
  const handleSelect = (suggestion: any) => {
    setSuggestion(suggestion);
    // Scroll to trip form
    setTimeout(() => {
      const formElement = document.getElementById('trip-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return <TripSearchBar onSelect={handleSelect} />;
}

