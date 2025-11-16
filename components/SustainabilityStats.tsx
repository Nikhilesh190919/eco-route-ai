"use client";
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RouteOption, Trip } from '@/types/routes';

type TripItem = Trip & {
  options: RouteOption[]; // Map from routeOptions for backward compatibility
};

type Props = {
  trips: TripItem[];
};

/**
 * Estimate distance between two locations (simplified)
 * In production, use a geocoding API
 */
function estimateDistance(origin: string, destination: string): number {
  const seed = (origin + destination).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 100 + (seed % 1100); // 100-1200km range
}

/**
 * Calculate average CO₂ per km for typical travel (baseline)
 * Average of all transport modes: ~0.15 kg CO₂/km
 */
const AVERAGE_CO2_PER_KM = 0.15;

export function SustainabilityStats({ trips }: Props) {
  const stats = useMemo(() => {
    if (trips.length === 0) {
      return {
        totalTrips: 0,
        averageEcoScore: 0,
        totalCo2Saved: 0,
        totalCo2Emitted: 0,
        averageCo2Emitted: 0,
        savingsPercent: 0,
        monthlyData: [],
        co2ByMonth: [],
      };
    }

    let totalEcoScore = 0;
    let totalCo2Emitted = 0;
    let totalAverageCo2 = 0;
    let tripCount = 0;

    // Group trips by month for chart data
    const monthlyData: Record<string, { trips: number; co2: number; avgCo2: number; ecoScore: number }> = {};

    trips.forEach((trip) => {
      if (trip.options.length === 0) return;

      // Get best option (highest eco-score) with safe handling
      const bestOption = trip.options.reduce((best: RouteOption, current: RouteOption) => {
        const bestScore = typeof best?.ecoScore === 'number' ? best.ecoScore : 0;
        const currentScore = typeof current?.ecoScore === 'number' ? current.ecoScore : 0;
        return currentScore > bestScore ? current : best;
      });

      const bestEcoScore = typeof bestOption?.ecoScore === 'number' ? bestOption.ecoScore : 0;
      const bestCo2Kg = typeof bestOption?.co2Kg === 'number' ? bestOption.co2Kg : 0;
      
      totalEcoScore += bestEcoScore;
      totalCo2Emitted += bestCo2Kg;
      tripCount++;

      // Calculate what CO₂ would have been with average travel
      const distance = estimateDistance(trip.origin, trip.destination);
      const averageCo2ForTrip = distance * AVERAGE_CO2_PER_KM;
      totalAverageCo2 += averageCo2ForTrip;

      // Group by month
      const date = new Date(trip.dateStart);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          trips: 0,
          co2: 0,
          avgCo2: 0,
          ecoScore: 0,
        };
      }

      monthlyData[monthKey].trips += 1;
      monthlyData[monthKey].co2 += bestCo2Kg;
      monthlyData[monthKey].avgCo2 += averageCo2ForTrip;
      monthlyData[monthKey].ecoScore += bestEcoScore;
    });

    const averageEcoScore = tripCount > 0 ? Math.round(totalEcoScore / tripCount) : 0;
    const totalCo2Saved = totalAverageCo2 - totalCo2Emitted;
    const savingsPercent = totalAverageCo2 > 0 ? Math.round((totalCo2Saved / totalAverageCo2) * 100) : 0;

    // Prepare chart data
    const monthlyDataArray = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const date = new Date(key + '-01');
        return {
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          actual: Math.round(data.co2 * 10) / 10,
          average: Math.round(data.avgCo2 * 10) / 10,
          saved: Math.round((data.avgCo2 - data.co2) * 10) / 10,
        };
      });

    // Prepare CO₂ savings chart data
    const co2ByMonth = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const date = new Date(key + '-01');
        return {
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          co2Saved: Math.round((data.avgCo2 - data.co2) * 10) / 10,
        };
      });

    return {
      totalTrips: trips.length,
      averageEcoScore,
      totalCo2Saved: Math.round(totalCo2Saved * 10) / 10,
      totalCo2Emitted: Math.round(totalCo2Emitted * 10) / 10,
      averageCo2Emitted: Math.round(totalAverageCo2 * 10) / 10,
      savingsPercent,
      monthlyData: monthlyDataArray,
      co2ByMonth,
    };
  }, [trips]);

  if (trips.length === 0) {
    return (
      <div className="card p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-200 dark:border-emerald-800">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Sustainability Data Yet</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Plan your first trip to start tracking your eco-impact!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Trips */}
        <div className="card p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Trips</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalTrips}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Eco-friendly journeys</p>
          </div>
        </div>

        {/* Average Eco-Score */}
        <div className="card p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Eco-Score</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.averageEcoScore}</p>
              <div className={`w-3 h-3 rounded-full ${
                stats.averageEcoScore >= 70 ? 'bg-green-500' :
                stats.averageEcoScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Out of 100</p>
          </div>
        </div>

        {/* CO₂ Saved */}
        <div className="card p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CO₂ Saved</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalCo2Saved.toFixed(1)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {stats.savingsPercent}% vs average travel
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CO₂ Comparison Chart */}
        <div className="card p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">CO₂ Emissions Comparison</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your eco-friendly choices vs. average travel</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                tick={{ fill: '#6b7280' }}
                label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(255, 255, 255)',
                  border: '1px solid rgb(229, 231, 235)',
                  borderRadius: '8px',
                  color: 'rgb(17, 24, 39)',
                }}
              />
              <Legend />
              <Bar dataKey="average" fill="#ef4444" name="Average Travel" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="#10b981" name="Your Trips" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CO₂ Savings Over Time */}
        <div className="card p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">CO₂ Savings Trend</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monthly CO₂ savings from eco-friendly choices</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.co2ByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                tick={{ fill: '#6b7280' }}
                label={{ value: 'CO₂ Saved (kg)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(255, 255, 255)',
                  border: '1px solid rgb(229, 231, 235)',
                  borderRadius: '8px',
                  color: 'rgb(17, 24, 39)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="co2Saved"
                stroke="#10b981"
                strokeWidth={3}
                name="CO₂ Saved"
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card p-6 bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-700 dark:to-green-700 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold mb-2">Your Environmental Impact</h3>
            <p className="text-emerald-50">
              By choosing eco-friendly routes, you've saved <strong className="text-white">{stats.totalCo2Saved.toFixed(1)} kg</strong> of CO₂
              {stats.savingsPercent > 0 && (
                <span>, which is <strong className="text-white">{stats.savingsPercent}%</strong> less than average travel!</span>
              )}
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="text-4xl font-bold">{stats.savingsPercent}%</div>
            <div className="text-sm text-emerald-50">CO₂ Reduction</div>
          </div>
        </div>
      </div>
    </div>
  );
}

