"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type Props = {
  tripId: string;
  origin: string;
  destination: string;
  budget: number;
};

export function PlanRoutesButton({ tripId, origin, destination, budget }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePlanRoutes = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          origin,
          destination,
          budget,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to plan routes' }));
        throw new Error(errorData.error || 'Failed to plan routes');
      }

      const data = await res.json();
      
      if (data.success && data.routes && data.routes.length > 0) {
        // Refresh the page to show new routes
        router.refresh();
      } else {
        setError('No routes were generated. Please try again.');
      }
    } catch (err: any) {
      console.error('Plan routes error:', err);
      setError(err.message || 'Failed to plan routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <motion.button
        onClick={handlePlanRoutes}
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full sm:w-auto px-6 py-3 rounded-lg font-medium text-white
          bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          flex items-center justify-center gap-2
        `}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Planning Routes...</span>
          </>
        ) : (
          <>
            <span>🌿</span>
            <span>Plan Routes</span>
          </>
        )}
      </motion.button>
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}
    </div>
  );
}

