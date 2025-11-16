import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'EcoRoute AI - Sustainable Travel Planner',
  description: 'Plan your sustainable trips with AI-powered route recommendations. Compare cost, time, and CO₂ emissions to choose the greenest travel option.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full transition-theme duration-300" suppressHydrationWarning>
      <body className="h-full transition-theme duration-300">
        {/* Inline script to prevent flash of wrong theme - runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const root = document.documentElement;
                  
                  if (theme === 'dark') {
                    root.classList.add('dark');
                  } else if (theme === 'light') {
                    root.classList.remove('dark');
                  } else {
                    // System theme
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) {
                      root.classList.add('dark');
                    } else {
                      root.classList.remove('dark');
                    }
                  }
                } catch (e) {
                  console.error('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
        <Providers>
          <ThemeProvider>
            <ErrorBoundary>
              <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-theme duration-300">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-theme duration-300">
                  <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left transition-theme duration-300">
                    Built with Next.js, Prisma, and Auth.js
                  </div>
                </footer>
              </div>
            </ErrorBoundary>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

