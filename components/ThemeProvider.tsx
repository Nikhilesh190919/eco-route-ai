"use client";
import { useTheme } from '@/lib/useTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme - this hook will handle localStorage and apply theme to html
  useTheme();

  return <>{children}</>;
}

