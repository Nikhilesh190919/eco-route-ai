"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { createTripSchemaEnhanced, planSchemaEnhanced } from '@/lib/validators';
import { SearchBar, type SearchSuggestion } from '@/components/SearchBar';
import { RouteCard } from '@/components/RouteCard';
import { TripSuggestion } from '@/components/TripSearchBar';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { RouteOption } from '@/types/routes';
import { AutocompleteInput } from '@/components/AutocompleteInput';

type FormData = z.infer<typeof createTripSchemaEnhanced>;

export function TripForm({ onCreated, initialSuggestion }: { onCreated?: () => void; initialSuggestion?: TripSuggestion | null }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [options, setRouteOptions] = useState<RouteOption[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const { showToast, ToastContainer } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch, trigger } = useForm<FormData>({
    resolver: zodResolver(createTripSchemaEnhanced),
    defaultValues: {
      origin: '',
      destination: '',
      budget: 100,
      dateRange: {
        start: new Date().toISOString().slice(0,10),
        end: new Date().toISOString().slice(0,10),
      },
    },
  });

  const origin = watch('origin');
  const destination = watch('destination');
  const budget = watch('budget');
  const dateRange = watch('dateRange');

  // Pre-fill form when initial suggestion is provided
  useEffect(() => {
    if (initialSuggestion) {
      if (initialSuggestion.origin) setValue('origin', initialSuggestion.origin);
      if (initialSuggestion.destination) setValue('destination', initialSuggestion.destination);
    }
  }, [initialSuggestion, setValue]);

  const onSelectSuggestion = (s: SearchSuggestion) => {
    const currentOrigin = watch('origin');
    
    // If Origin is empty → fill Origin
    // Else → fill Destination
    if (!currentOrigin || currentOrigin.trim() === '') {
      // Fill Origin if it's empty
      if (s.origin) {
        setValue('origin', s.origin);
      } else if (s.destination) {
        setValue('origin', s.destination);
      } else if (s.label) {
        setValue('origin', s.label);
      }
    } else {
      // Fill Destination if Origin is already filled
      if (s.destination) {
        setValue('destination', s.destination);
      } else if (s.origin) {
        setValue('destination', s.origin);
      } else if (s.label) {
        setValue('destination', s.label);
      }
    }
  };

  const handlePlan = async () => {
    if (!origin || !destination) {
      setPlanningError('Please enter both origin and destination');
      return;
    }

    setPlanningError(null);
    setPlanning(true);
    setShowOptions(false);
    setShowEmptyState(false);
    setRouteOptions([]);
    
    try {
      // Validate form data
      const planData = planSchemaEnhanced.parse({ origin, destination, budget });
      
      // Prepare request payload with dates for future API use
      const requestPayload = {
        ...planData,
        start: dateRange?.start || new Date().toISOString().slice(0, 10),
        end: dateRange?.end || new Date().toISOString().slice(0, 10),
      };
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-200 responses with toast
      if (!res.ok) {
        showToast('No routes found. Try adjusting your budget or dates.', 'error');
        setShowEmptyState(false);
        setShowOptions(false);
        setRouteOptions([]);
        return;
      }

      const data = await res.json();
      
      // Handle both 'routes' and 'options' for backward compatibility
      const routes = data.routes || data.options || [];
      
      // Handle 200 with empty array - show EmptyState
      if (!routes || routes.length === 0) {
        setShowEmptyState(true);
        setShowOptions(false);
        setRouteOptions([]);
        return;
      }

      // Success - show route options
      setRouteOptions(routes);
      setShowOptions(true);
      setShowEmptyState(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setPlanningError('Request timed out. Please try again with a smaller distance or check your connection.');
      } else if (err.errors) {
        // Zod validation errors
        const errorMessages = Object.values(err.errors).flat() as string[];
        setPlanningError(errorMessages.join(', '));
      } else if (err.message) {
        setPlanningError(err.message);
      } else {
        setPlanningError('Failed to plan trip. Please check your connection and try again.');
      }
      setRouteOptions([]);
      setShowOptions(false);
      setShowEmptyState(false);
    } finally {
      setPlanning(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Include route options if available
      const requestBody = {
        ...data,
        ...(options.length > 0 ? { options } : {}),
      };

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ 
          error: res.status === 401 
            ? 'Please sign in to save trips'
            : res.status === 400
            ? 'Invalid trip data. Please check your input.'
            : 'Failed to create trip'
        }));
        throw new Error(errorData.error || 'Failed to create trip');
      }

      const result = await res.json();
      
      // If trip was created, redirect to trip detail page
      if (result.trip?.id) {
        // Routes are already saved if options were included in the request
        // Redirect to trip detail page
        window.location.href = `/trip/${result.trip.id}`;
        return;
      }
      
      reset();
      setRouteOptions([]);
      setShowOptions(false);
      setPlanningError(null);
      onCreated?.();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setServerError('Request timed out. Please check your connection and try again.');
      } else if (err.message) {
        setServerError(err.message);
      } else {
        setServerError('Failed to create trip. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="trip-form" onSubmit={handleSubmit(onSubmit)} className="card p-4 sm:p-6 space-y-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      {/* Search Bar Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Quick Search
        </label>
        <SearchBar placeholder="Try 'San Francisco → Los Angeles' or search destinations" onSelect={onSelectSuggestion} />
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Origin */}
        <AutocompleteInput
          id="origin"
          label="Origin"
          placeholder="e.g., San Francisco"
          value={origin}
          onChange={(value) => {
            setValue('origin', value, { shouldValidate: true });
            trigger('origin');
          }}
          onBlur={() => trigger('origin')}
          disabled={loading || planning}
          error={errors.origin?.message}
          icon={<span className="text-emerald-600 dark:text-emerald-400">📍</span>}
        />

        {/* Destination */}
        <AutocompleteInput
          id="destination"
          label="Destination"
          placeholder="e.g., Los Angeles"
          value={destination}
          onChange={(value) => {
            setValue('destination', value, { shouldValidate: true });
            trigger('destination');
          }}
          onBlur={() => trigger('destination')}
          disabled={loading || planning}
          error={errors.destination?.message}
          icon={<span className="text-emerald-600 dark:text-emerald-400">🎯</span>}
        />

        {/* Budget */}
        <div>
          <label htmlFor="budget" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400">💰</span>
            Budget ($)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
            <input 
              id="budget"
              type="number" 
              className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 pl-8 pr-4 py-3 text-base bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              placeholder="100"
              disabled={loading || planning}
              {...register('budget', { valueAsNumber: true })} 
            />
          </div>
          {errors.budget && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.budget.message}</p>}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="start-date" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">📅</span>
              Start
            </label>
            <input 
              id="start-date"
              type="date" 
              className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 px-4 py-3 text-base bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              disabled={loading || planning}
              {...register('dateRange.start')} 
            />
            {errors.dateRange?.start && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.dateRange.start.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">📅</span>
              End
            </label>
            <input 
              id="end-date"
              type="date" 
              className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 px-4 py-3 text-base bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              disabled={loading || planning}
              {...register('dateRange.end')} 
            />
            {errors.dateRange?.end && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.dateRange.end.message}</p>
            )}
          </div>
        </div>
      </div>
      {planningError && (
        <ErrorDisplay
          title="Planning failed"
          message={planningError}
          onRetry={handlePlan}
        />
      )}
      {serverError && (
        <ErrorDisplay
          title="Save failed"
          message={serverError}
          onRetry={() => handleSubmit(onSubmit)()}
        />
      )}
      
      {planning && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center gap-3">
            <LoadingSpinner size="md" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Planning your route...</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Analyzing options and calculating CO₂ emissions</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State for no routes found */}
      {showEmptyState && !planning && (
        <EmptyState
          title="No routes found"
          description="No routes found. Try adjusting your budget or dates."
          ctaLabel="Plan Routes"
          ctaHref="/"
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handlePlan}
          disabled={planning || loading || !origin || !destination}
          className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 dark:bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 active:bg-emerald-800 dark:active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 touch-manipulation"
        >
          {planning ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Planning Routes...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Plan Routes</span>
            </>
          )}
        </button>
        <button 
          type="submit" 
          className="flex-1 sm:flex-none px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 active:bg-gray-950 dark:active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 touch-manipulation" 
          disabled={loading || planning}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving Trip...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Trip</span>
            </>
          )}
        </button>
      </div>

      {showOptions && options.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Route Options</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">{options.length} option{options.length !== 1 ? 's' : ''} found</span>
          </div>
          <div className="space-y-2">
            {options.map((option, idx) => (
              <RouteCard
                key={idx}
                mode={option.mode}
                cost={option.cost}
                durationMins={option.durationMins}
                co2Kg={option.co2Kg}
                ecoScore={option.ecoScore}
                notes={option.notes}
              />
            ))}
          </div>
        </div>
      )}
      
      {!planning && !showOptions && !showEmptyState && options.length === 0 && origin && destination && (
        <div className="rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Click "Plan Routes" to see eco-friendly options</p>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />
    </form>
  );
}

