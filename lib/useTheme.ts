"use client";
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  const resolveTheme = useCallback((themeValue: Theme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return themeValue;
  }, []);

  const applyTheme = useCallback((themeValue: Theme) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const resolved = resolveTheme(themeValue);

    // Tailwind dark mode works by adding/removing 'dark' class only
    // No 'light' class needed - absence of 'dark' means light mode
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    setResolvedTheme(resolved);
  }, [resolveTheme]);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('theme') as Theme | null;
    const initialTheme = stored || 'system';
    setTheme(initialTheme);
    
    // Apply theme immediately on mount
    applyTheme(initialTheme);
  }, [applyTheme]);

  // Apply theme reactively when theme state changes
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    applyTheme(theme);

    // Listen for system theme changes when using 'system' mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyTheme('system');
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme, mounted, applyTheme]);

  const updateTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    
    // Apply theme immediately
    applyTheme(newTheme);
  }, [applyTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme: updateTheme,
    mounted,
  };
}

