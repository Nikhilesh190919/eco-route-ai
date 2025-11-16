import { EcoScoreBadge } from './EcoScoreBadge';
import type { RouteMode } from '@/types/routes';

type Props = {
  mode?: RouteMode | string; // Allow string for backward compatibility
  cost?: number;
  durationMins?: number;
  co2Kg?: number;
  ecoScore?: number;
  notes?: string;
};

export function RouteCard({ mode, cost, durationMins, co2Kg, ecoScore, notes }: Props) {
  // Safely handle missing values with fallbacks
  const safeMode = mode ?? 'Unknown';
  const safeCost = cost ?? 0;
  const safeDurationMins = durationMins ?? 0;
  const safeCo2Kg = co2Kg ?? 0;
  const safeEcoScore = ecoScore ?? 0;
  
  const hours = Math.floor(safeDurationMins / 60);
  const mins = safeDurationMins % 60;
  
  return (
    <div className="card p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs uppercase whitespace-nowrap font-medium">{safeMode}</span>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {safeDurationMins > 0 ? `${hours}h ${mins}m` : 'N/A'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-6 text-xs sm:text-sm">
          <div className="whitespace-nowrap">
            <span className="font-medium text-gray-900 dark:text-gray-100">${safeCost > 0 ? safeCost.toFixed(2) : 'N/A'}</span> <span className="hidden sm:inline text-gray-600 dark:text-gray-400">cost</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="font-medium text-gray-900 dark:text-gray-100">{safeCo2Kg > 0 ? `${safeCo2Kg.toFixed(1)}kg` : 'N/A'}</span> <span className="hidden sm:inline text-gray-600 dark:text-gray-400">CO₂</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
            <span className="hidden sm:inline text-gray-600 dark:text-gray-400">Eco score</span>
            <EcoScoreBadge score={safeEcoScore} size={24} />
          </div>
        </div>
      </div>
      {notes && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic">{notes}</p>
        </div>
      )}
    </div>
  );
}

