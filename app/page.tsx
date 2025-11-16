import { ChatPanel } from '@/components/ChatPanel';
import { HomePageClient } from '@/components/HomePageClient';
import { HomePageWrapper } from '@/components/HomePageWrapper';
import { TripSearchBarWrapper } from '@/components/TripSearchBarWrapper';

export default function HomePage() {
  return (
    <HomePageClient>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 w-full">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight text-gray-900 dark:text-gray-100">Plan your sustainable trip</h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Compare cost, time, and CO₂ to pick the greenest option.</p>
        </div>
        
        <div className="card p-4 sm:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">AI-Powered Trip Search</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Search for destinations, routes, or get AI recommendations for sustainable travel</p>
            </div>
            <TripSearchBarWrapper />
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <HomePageWrapper />
          <ChatPanel />
        </div>
      </div>
    </HomePageClient>
  );
}

