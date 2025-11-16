"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { planSchemaEnhanced } from '@/lib/validators';
import { RouteCard } from '@/components/RouteCard';
import { z } from 'zod';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RouteOption } from '@/types/routes';

type FormData = z.infer<typeof planSchemaEnhanced>;

export function ChatPanel() {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(planSchemaEnhanced),
    defaultValues: {
      origin: '',
      destination: '',
      budget: 100,
    },
  });

  const onPlan = async (data: FormData) => {
    setServerError(null);
    setLoading(true);
    setOptions([]);
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ 
          error: res.status === 503 
            ? 'AI service temporarily unavailable. Please try again in a moment.'
            : res.status === 400
            ? 'Invalid input. Please check your entries.'
            : 'Failed to plan trip. Please try again.'
        }));
        throw new Error(errorData.error || 'Failed to plan trip');
      }

      const result = await res.json();
      if (!result.options || result.options.length === 0) {
        throw new Error('No route options found for this route. Try different locations or increase your budget.');
      }

      setOptions(result.options);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setServerError('Request timed out. Please try again with a smaller distance or check your connection.');
      } else if (e.message) {
        setServerError(e.message);
      } else {
        setServerError('Failed to plan trip. Please check your connection and try again.');
      }
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4 sm:p-6 space-y-3">
      <div className="text-sm font-medium">Quick Trip Planner</div>
      <form onSubmit={handleSubmit(onPlan)} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <input
              className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Origin"
              {...register('origin')}
              disabled={loading}
            />
            {errors.origin && (
              <p className="text-xs text-red-600 mt-1">{errors.origin.message}</p>
            )}
          </div>
          <div>
            <input
              className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Destination"
              {...register('destination')}
              disabled={loading}
            />
            {errors.destination && (
              <p className="text-xs text-red-600 mt-1">{errors.destination.message}</p>
            )}
          </div>
          <div>
            <input
              type="number"
              className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Budget ($)"
              {...register('budget', { valueAsNumber: true })}
              disabled={loading}
              min="1"
            />
            {errors.budget && (
              <p className="text-xs text-red-600 mt-1">{errors.budget.message}</p>
            )}
          </div>
        </div>
        <button
          type="submit"
          className="btn w-full sm:w-auto touch-manipulation"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="hidden sm:inline">Planning routes...</span>
              <span className="sm:hidden">Planning...</span>
            </span>
          ) : (
            <>
              <span className="hidden sm:inline">Plan Routes</span>
              <span className="sm:hidden">Plan</span>
            </>
          )}
        </button>
        {serverError && (
          <ErrorDisplay
            title="Planning failed"
            message={serverError}
            onRetry={() => handleSubmit(onPlan)()}
          />
        )}
      </form>
      
      {loading && !serverError && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center gap-3">
            <LoadingSpinner size="md" />
            <div>
              <p className="text-sm font-medium text-blue-900">Analyzing routes...</p>
              <p className="text-xs text-blue-700 mt-1">Calculating CO₂ emissions and finding eco-friendly options</p>
            </div>
          </div>
        </div>
      )}
      
      {!loading && !serverError && options.length === 0 && (
        <div className="rounded-md bg-gray-50 border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-600">Enter your trip details above to see route options</p>
        </div>
      )}
      
      {!loading && options.length > 0 && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Route Options</h3>
            <span className="text-xs text-gray-500">{options.length} option{options.length !== 1 ? 's' : ''} found</span>
          </div>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <RouteCard
                key={idx}
                mode={opt.mode}
                cost={opt.cost}
                durationMins={opt.durationMins}
                co2Kg={opt.co2Kg}
                ecoScore={opt.ecoScore}
                notes={opt.notes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

