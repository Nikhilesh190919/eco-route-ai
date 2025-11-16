"use client";
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { RouteOption } from '@/types/routes';

type Props = {
  routes: RouteOption[];
};

/**
 * Get mode display name
 */
function getModeName(mode: string): string {
  const modeMap: Record<string, string> = {
    train: 'Train',
    car: 'Car',
    flight: 'Flight',
    bus: 'Bus',
  };
  return modeMap[mode.toLowerCase()] || mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function TripSummary({ routes }: Props) {
  const summary = useMemo(() => {
    if (!routes || routes.length === 0) {
      return null;
    }

    // Find best eco route (highest ecoScore)
    const bestRoute = routes.reduce((best, current) => {
      const bestScore = typeof best.ecoScore === 'number' ? best.ecoScore : 0;
      const currentScore = typeof current.ecoScore === 'number' ? current.ecoScore : 0;
      return currentScore > bestScore ? current : best;
    }, routes[0]);

    // Find worst route (highest CO₂ emissions)
    const worstRoute = routes.reduce((worst, current) => {
      const worstCo2 = typeof worst.co2Kg === 'number' ? worst.co2Kg : 0;
      const currentCo2 = typeof current.co2Kg === 'number' ? current.co2Kg : 0;
      return currentCo2 > worstCo2 ? current : worst;
    }, routes[0]);

    // Calculate CO₂ saved
    const bestCo2 = typeof bestRoute.co2Kg === 'number' ? bestRoute.co2Kg : 0;
    const worstCo2 = typeof worstRoute.co2Kg === 'number' ? worstRoute.co2Kg : 0;
    const co2Saved = Math.max(0, worstCo2 - bestCo2);

    // Calculate average cost of all routes
    const totalCost = routes.reduce((sum, route) => {
      const cost = typeof route.cost === 'number' ? route.cost : 0;
      return sum + cost;
    }, 0) / routes.length;

    return {
      bestRouteName: getModeName(bestRoute.mode || ''),
      totalCost: Math.round(totalCost),
      co2Saved,
      bestRoute,
    };
  }, [routes]);

  if (!summary) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 p-6 sm:p-8"
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🌿</span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Trip Summary
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Best Eco Route */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">♻️</span>
              <p className="text-xs sm:text-sm text-emerald-100 uppercase tracking-wide">
                Best Eco Route
              </p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">
              {summary.bestRouteName}
            </p>
            <p className="text-xs text-emerald-100 mt-1">
              Eco Score: {typeof summary.bestRoute.ecoScore === 'number' ? summary.bestRoute.ecoScore : 'N/A'}
            </p>
          </div>

          {/* Total Cost */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💰</span>
              <p className="text-xs sm:text-sm text-emerald-100 uppercase tracking-wide">
                Total Cost
              </p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">
              ${summary.totalCost.toFixed(0)}
            </p>
            <p className="text-xs text-emerald-100 mt-1">
              Average across routes
            </p>
          </div>

          {/* CO₂ Saved */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌿</span>
              <p className="text-xs sm:text-sm text-emerald-100 uppercase tracking-wide">
                CO₂ Saved
              </p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">
              {summary.co2Saved.toFixed(1)} kg
            </p>
            <p className="text-xs text-emerald-100 mt-1">
              vs. highest emission route
            </p>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs sm:text-sm text-emerald-100 text-center">
            Choosing the eco-friendly route saves {summary.co2Saved.toFixed(1)} kg of CO₂ compared to the highest emission option
          </p>
        </div>
      </div>
    </motion.div>
  );
}

