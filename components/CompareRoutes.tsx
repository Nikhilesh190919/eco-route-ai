"use client";
import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { RouteOption } from '@/types/routes';

type Props = {
  routes: RouteOption[];
};

type Metric = 'cost' | 'duration' | 'co2' | 'ecoScore';

const METRIC_CONFIG: Record<Metric, { label: string; icon: string; color: string; unit: string }> = {
  cost: {
    label: 'Cost',
    icon: '💰',
    color: '#10b981', // green-500
    unit: '$',
  },
  duration: {
    label: 'Duration',
    icon: '⏱️',
    color: '#3b82f6', // blue-500
    unit: 'hrs',
  },
  co2: {
    label: 'CO₂',
    icon: '🌿',
    color: '#f97316', // orange-500
    unit: 'kg',
  },
  ecoScore: {
    label: 'Eco Score',
    icon: '♻️',
    color: '#14b8a6', // teal-500
    unit: '',
  },
};

export function CompareRoutes({ routes }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<Metric>('cost');

  // Prepare chart data
  const chartData = useMemo(() => {
    return routes.map((route) => {
      const modeLabel = route.mode?.charAt(0).toUpperCase() + route.mode?.slice(1) || 'Unknown';
      
      return {
        mode: modeLabel,
        cost: typeof route.cost === 'number' ? route.cost : 0,
        duration: Math.round((typeof route.durationMins === 'number' ? route.durationMins : 0) / 60 * 10) / 10, // Convert to hours with 1 decimal
        co2: typeof route.co2Kg === 'number' ? route.co2Kg : 0,
        ecoScore: typeof route.ecoScore === 'number' ? route.ecoScore : 0,
        originalRoute: route,
      };
    });
  }, [routes]);

  const currentMetricConfig = METRIC_CONFIG[selectedMetric];

  // Calculate max value for Y-axis scaling
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 100;
    const values = chartData.map((d) => d[selectedMetric] as number);
    const max = Math.max(...values);
    return max > 0 ? Math.ceil(max * 1.1) : 100; // Add 10% padding, minimum 100
  }, [chartData, selectedMetric]);

  // Format duration from minutes to "Xh Ym" format
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Custom tooltip with exact values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const route = data.originalRoute;
      const cost = typeof route.cost === 'number' ? route.cost : 0;
      const durationMins = typeof route.durationMins === 'number' ? route.durationMins : 0;
      const co2 = typeof route.co2Kg === 'number' ? route.co2Kg : 0;
      const ecoScore = typeof route.ecoScore === 'number' ? route.ecoScore : 0;
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50"
        >
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
            {data.mode}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                💰 Cost:
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">${cost.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                ⏱️ Duration:
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(durationMins)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                🌿 CO₂:
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{co2.toFixed(1)} kg</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                ♻️ Eco Score:
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{ecoScore}</span>
            </div>
          </div>
        </motion.div>
      );
    }
    return null;
  };

  // Calculate average eco score
  const averageEcoScore = useMemo(() => {
    if (routes.length === 0) return 0;
    const scores = routes
      .map((r) => typeof r.ecoScore === 'number' ? r.ecoScore : 0)
      .filter((s) => s > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }, [routes]);

  if (routes.length < 2) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-3xl mx-auto w-full"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Compare Routes
          </h2>
          
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(METRIC_CONFIG) as Metric[]).map((metric) => {
              const config = METRIC_CONFIG[metric];
              const isSelected = selectedMetric === metric;
              
              return (
                <motion.button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isSelected
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <span className="mr-1.5">{config.icon}</span>
                  {config.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedMetric}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.5
            }}
            className="w-full h-64 sm:h-80"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis
                  dataKey="mode"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:text-gray-400"
                  style={{ fill: '#6b7280' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:text-gray-400"
                  domain={[0, maxValue]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={selectedMetric}
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                  animationBegin={0}
                  isAnimationActive={true}
                >
                  {chartData.map((entry, index) => {
                    // Create gradient colors for each bar
                    const gradientId = `gradient-${selectedMetric}-${index}`;
                    const baseColor = currentMetricConfig.color;
                    
                    // Generate gradient shades (lighter to darker)
                    const getGradientColor = (color: string, opacity: number) => {
                      // Convert hex to RGB and apply opacity
                      const r = parseInt(color.slice(1, 3), 16);
                      const g = parseInt(color.slice(3, 5), 16);
                      const b = parseInt(color.slice(5, 7), 16);
                      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                    };
                    
                    return (
                      <g key={`cell-${index}`}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={getGradientColor(baseColor, 0.9)} />
                            <stop offset="50%" stopColor={getGradientColor(baseColor, 0.7)} />
                            <stop offset="100%" stopColor={getGradientColor(baseColor, 0.5)} />
                          </linearGradient>
                        </defs>
                        <Cell
                          fill={`url(#${gradientId})`}
                          stroke={baseColor}
                          strokeWidth={1.5}
                        />
                      </g>
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>

        {/* Average Eco Score Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">♻️</span>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Average Eco Score</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {averageEcoScore}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">/ 100</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                averageEcoScore >= 70 
                  ? 'bg-emerald-500' 
                  : averageEcoScore >= 40 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {averageEcoScore >= 70 
                  ? 'Excellent' 
                  : averageEcoScore >= 40 
                  ? 'Moderate' 
                  : 'Needs Improvement'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Showing: <span className="font-medium">{currentMetricConfig.icon} {currentMetricConfig.label}</span>
            {currentMetricConfig.unit && ` (${currentMetricConfig.unit})`}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

