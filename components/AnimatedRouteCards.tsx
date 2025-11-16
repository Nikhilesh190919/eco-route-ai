"use client";
import { motion } from 'framer-motion';
import { RouteCard } from '@/components/RouteCard';

type RouteOption = {
  id?: string;
  mode?: string;
  cost?: number;
  durationMins?: number;
  co2Kg?: number;
  ecoScore?: number;
  notes?: string;
};

type Props = {
  routes: RouteOption[];
};

export function AnimatedRouteCards({ routes }: Props) {
  return (
    <div className="space-y-2">
      {routes.map((route, index) => (
        <motion.div
          key={route.id || index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <RouteCard
            mode={route.mode}
            cost={route.cost}
            durationMins={route.durationMins}
            co2Kg={route.co2Kg}
            ecoScore={route.ecoScore}
            notes={route.notes}
          />
        </motion.div>
      ))}
    </div>
  );
}

