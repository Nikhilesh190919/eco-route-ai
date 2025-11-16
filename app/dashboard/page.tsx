import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardClient } from '@/components/DashboardClient';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { DashboardSearchBar } from '@/components/DashboardSearchBar';
import { DashboardChatAssistant } from '@/components/DashboardChatAssistant';
import { SustainabilityStats } from '@/components/SustainabilityStats';
import type { RouteOption } from '@/types/routes';

export default async function DashboardPage() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 w-full">
          <div className="card p-4 sm:p-6">
            <div className="text-sm">Please <a href="/auth/signin" className="text-primary underline">sign in</a> to view your trips.</div>
          </div>
        </div>
      );
    }

    const trips = await prisma.trip.findMany({
      where: { createdBy: session.user.id },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    });

    const safeTrips = trips.map((t) => ({
      id: t.id,
      origin: t.origin,
      destination: t.destination,
      budget: t.budget,
      dateStart: t.dateStart.toISOString(),
      dateEnd: t.dateEnd.toISOString(),
      options: t.options.map((o): RouteOption => {
        // Map mode to base RouteMode type
        const rawMode = o.mode?.toLowerCase() || 'train';
        let mode: RouteOption['mode'];
        
        if (rawMode === 'train' || rawMode === 'bus' || rawMode === 'flight' || rawMode === 'car') {
          mode = rawMode;
        } else if (rawMode === 'ferry' || rawMode === 'boat' || rawMode === 'ship') {
          mode = 'car';
        } else if (rawMode.includes('train') && rawMode.includes('bus')) {
          mode = 'train';
        } else if (rawMode.includes('train')) {
          mode = 'train';
        } else if (rawMode.includes('bus')) {
          mode = 'bus';
        } else if (rawMode.includes('flight') || rawMode.includes('airplane') || rawMode.includes('plane')) {
          mode = 'flight';
        } else {
          mode = 'train';
        }
        
        return {
          id: o.id,
          mode,
          cost: o.cost,
          durationMins: o.durationMins,
          co2Kg: o.co2Kg, // Required - TypeScript will error if missing
          ecoScore: o.ecoScore,
          ...(o.notes ? { notes: o.notes } : {}),
        };
      }),
    }));

    // Get user name for welcome message
    const userName = session.user?.name || session.user?.email?.split('@')[0] || 'User';
    const userEmail = session.user?.email || '';

    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 w-full">
        {/* AI-Powered Search Bar */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-6 sm:p-8 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">AI-Powered Search</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Find destinations and plan eco-friendly routes</p>
            </div>
          </div>
          <DashboardSearchBar />
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 sm:p-8 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {userName} 👋
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
                Plan your next sustainable journey.
              </p>
              {userEmail && (
                <p className="text-sm text-gray-500 mt-1">{userEmail}</p>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>{trips.length} {trips.length === 1 ? 'trip' : 'trips'}</span>
            </div>
          </div>
        </div>

        {/* Sustainability Stats Section */}
        <SustainabilityStats trips={safeTrips} />

        {/* Trips Section */}
        {trips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Start planning your sustainable journey by creating your first trip from the home page."
            action={{
              label: "Plan a trip",
              href: "/"
            }}
            icon={
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            }
          />
        ) : (
          <DashboardClient trips={safeTrips} />
        )}

        {/* AI Chat Assistant */}
        <DashboardChatAssistant />
      </div>
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 w-full">
        <ErrorDisplay
          title="Failed to load trips"
          message="There was an error loading your trips. Please try refreshing the page."
        />
      </div>
    );
  }
}

