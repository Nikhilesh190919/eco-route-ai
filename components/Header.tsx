"use client";
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { UserMenu } from './UserMenu';

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40 shadow-sm transition-theme duration-300">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link href="/" className="text-base sm:text-lg font-semibold text-primary hover:opacity-80 transition-opacity flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-gray-900 dark:text-gray-100">EcoRoute AI</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm w-full sm:w-auto">
          <Link 
            href="/dashboard" 
            className="px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:bg-emerald-100 dark:active:bg-emerald-900/30 transition-colors touch-manipulation text-gray-700 dark:text-gray-300 font-medium"
          >
            Dashboard
          </Link>
          {status === 'loading' ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-4 h-4 border-2 border-emerald-600 dark:border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-400 dark:text-gray-500">Loading...</span>
            </div>
          ) : session ? (
            <UserMenu user={session.user} />
          ) : (
            <Link 
              href="/auth/signin" 
              className="px-3 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 active:bg-emerald-800 dark:active:bg-emerald-700 transition-colors touch-manipulation font-medium"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

