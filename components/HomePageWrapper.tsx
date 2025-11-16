"use client";
import { TripForm } from '@/components/TripForm';
import { useSuggestionContext } from '@/components/HomePageClient';

export function HomePageWrapper() {
  const { suggestion } = useSuggestionContext();
  return <TripForm initialSuggestion={suggestion} />;
}

