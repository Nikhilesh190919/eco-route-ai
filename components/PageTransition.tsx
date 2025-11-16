"use client";
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function PageTransition({ children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.5, 
          ease: "easeOut" 
        }
      }}
      exit={{ 
        opacity: 0, 
        y: -10,
        transition: { 
          duration: 0.3, 
          ease: "easeIn" 
        }
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

