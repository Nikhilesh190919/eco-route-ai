import { NextRequest, NextResponse } from 'next/server';
import { planSchemaEnhanced, RouteOptionSchema } from '@/lib/validators';
import { handleApiError, ValidationError } from '@/lib/errors';
import type { RouteOption } from '@/types/routes';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Estimate CO2 emissions based on mode and distance
 * CO2 emissions factors (kg CO2 per passenger-km)
 * Sources: European Environment Agency, UK Department for Transport
 */
function estimateCO2(mode: 'train' | 'car' | 'flight', distanceKm: number): number {
  const factors: Record<string, number> = {
    train: 0.041,
    car: 0.171,
    flight: 0.255,
  };
  return (factors[mode] || 0.2) * distanceKm;
}

/**
 * Estimate distance between origin and destination (km)
 * Simple hash-based estimation (100-1200km)
 * In production, use a geocoding API like Google Maps Distance Matrix
 */
function estimateDistance(origin: string, destination: string): number {
  const seed = (origin + destination).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 100 + (seed % 1100);
}

/**
 * Generate mock route options with realistic values
 */
function generateMockRoutes(origin: string, destination: string, budget: number): RouteOption[] {
  console.log(`[Plan Routes] Generating mock routes for ${origin} → ${destination} with budget $${budget}`);
  
  const distance = estimateDistance(origin, destination);
  const safeDistance = Math.max(50, Math.min(1200, distance));
  
  // Generate 3 routes: train, car, flight
  const routes: RouteOption[] = [];
  
  // 1. Train route (most eco-friendly)
  const trainCost = Math.max(50, Math.min(budget, Math.round(50 + (safeDistance * 0.15) + (Math.random() * 100))));
  const trainDurationMins = Math.max(60, Math.min(600, Math.round(60 + (safeDistance * 0.8) + (Math.random() * 120))));
  const trainCo2Kg = Math.round(estimateCO2('train', safeDistance) * 10) / 10;
  const trainEcoScore = Math.max(70, Math.min(100, Math.round(100 - (trainCo2Kg / safeDistance) * 500)));
  
  routes.push({
    mode: 'train',
    cost: trainCost,
    durationMins: trainDurationMins,
    co2Kg: trainCo2Kg,
    ecoScore: trainEcoScore,
    notes: 'Most eco-friendly option with low carbon emissions',
  });
  
  // 2. Car route (moderate)
  const carCost = Math.max(50, Math.min(budget, Math.round(80 + (safeDistance * 0.25) + (Math.random() * 150))));
  const carDurationMins = Math.max(60, Math.min(600, Math.round(90 + (safeDistance * 1.2) + (Math.random() * 180))));
  const carCo2Kg = Math.round(estimateCO2('car', safeDistance) * 10) / 10;
  const carEcoScore = Math.max(40, Math.min(69, Math.round(70 - (carCo2Kg / safeDistance) * 300)));
  
  routes.push({
    mode: 'car',
    cost: carCost,
    durationMins: carDurationMins,
    co2Kg: carCo2Kg,
    ecoScore: carEcoScore,
    notes: 'Convenient option with moderate emissions',
  });
  
  // 3. Flight route (fastest but highest emissions)
  const flightCost = Math.max(50, Math.min(budget, Math.round(100 + (safeDistance * 0.5) + (Math.random() * 200))));
  const flightDurationMins = Math.max(60, Math.min(600, Math.round(60 + (safeDistance * 0.3) + (Math.random() * 60))));
  const flightCo2Kg = Math.round(estimateCO2('flight', safeDistance) * 10) / 10;
  const flightEcoScore = Math.max(0, Math.min(39, Math.round(40 - (flightCo2Kg / safeDistance) * 200)));
  
  // Only include flight if budget allows
  if (flightCost <= budget) {
    routes.push({
      mode: 'flight',
      cost: flightCost,
      durationMins: flightDurationMins,
      co2Kg: flightCo2Kg,
      ecoScore: flightEcoScore,
      notes: 'Fastest option but highest emissions',
    });
  }
  
  // Sort by eco score (highest first)
  routes.sort((a, b) => b.ecoScore - a.ecoScore);
  
  console.log(`[Plan Routes] Generated ${routes.length} mock routes:`, routes.map(r => ({
    mode: r.mode,
    cost: r.cost,
    durationMins: r.durationMins,
    co2Kg: r.co2Kg,
    ecoScore: r.ecoScore,
  })));
  
  return routes;
}


export async function POST(req: NextRequest) {
  try {
    console.log('[Plan Routes] Received request');
    
    let body;
    try {
      body = await req.json();
      console.log('[Plan Routes] Request body:', { origin: body.origin, destination: body.destination, budget: body.budget, tripId: body.tripId });
    } catch (error) {
      console.error('[Plan Routes] Invalid JSON:', error);
      throw new ValidationError('Invalid JSON in request body');
    }

    const parsed = planSchemaEnhanced.safeParse(body);
    
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      console.error('[Plan Routes] Validation failed:', errors);
      throw new ValidationError('Invalid trip planning data', errors);
    }

    const { origin, destination, budget } = parsed.data;
    const tripId = body.tripId as string | undefined;

    // Additional validation
    if (!origin || origin.trim().length < 2) {
      throw new ValidationError('Origin must be at least 2 characters');
    }

    if (!destination || destination.trim().length < 2) {
      throw new ValidationError('Destination must be at least 2 characters');
    }

    if (budget <= 0) {
      throw new ValidationError('Budget must be greater than 0');
    }

    if (budget > 10000) {
      throw new ValidationError('Budget cannot exceed $10,000');
    }

    if (origin.toLowerCase().trim() === destination.toLowerCase().trim()) {
      throw new ValidationError('Origin and destination must be different');
    }

    // Generate mock route options
    const mockRoutes = generateMockRoutes(origin, destination, budget);
    
    // Validate all options with Zod schema
    const validatedOptions: RouteOption[] = [];
    for (const option of mockRoutes) {
      const result = RouteOptionSchema.safeParse(option);
      if (result.success) {
        validatedOptions.push(result.data);
      } else {
        console.warn('[Plan Routes] Route option validation failed:', {
          option,
          errors: result.error.errors,
        });
      }
    }

    // If validation fails for all options, return empty array with 200 status
    if (validatedOptions.length === 0) {
      console.warn('[Plan Routes] All route options failed validation, returning empty array');
      return NextResponse.json({ 
        success: false, 
        routes: [],
        error: 'Failed to generate valid route options'
      }, { status: 200 });
    }

    console.log(`[Plan Routes] Validated ${validatedOptions.length} route options`);

    // If tripId is provided, save routes to database
    if (tripId) {
      console.log(`[Plan Routes] Saving routes to trip ID: ${tripId}`);
      
      try {
        // Verify trip exists and user has access
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          console.warn('[Plan Routes] No session, skipping database save');
        } else {
          // Verify trip belongs to user
          const trip = await prisma.trip.findFirst({
            where: {
              id: tripId,
              createdBy: session.user.id,
            },
          });

          if (!trip) {
            console.warn(`[Plan Routes] Trip ${tripId} not found or access denied`);
          } else {
            // Delete existing options for this trip
            await prisma.routeOption.deleteMany({
              where: { tripId },
            });
            console.log(`[Plan Routes] Deleted existing route options for trip ${tripId}`);

            // Create new route options
            const createdOptions = await prisma.routeOption.createMany({
              data: validatedOptions.map((option) => ({
                tripId,
                mode: option.mode,
                cost: Math.round(option.cost),
                durationMins: option.durationMins,
                co2Kg: option.co2Kg,
                ecoScore: option.ecoScore,
              })),
            });

            console.log(`[Plan Routes] Saved ${createdOptions.count} route options to database`);
          }
        }
      } catch (dbError: any) {
        console.error('[Plan Routes] Database save error:', dbError);
        // Continue and return routes even if save fails
      }
    }

    console.log('[Plan Routes] Returning routes successfully');
    return NextResponse.json({ 
      success: true, 
      routes: validatedOptions,
      options: validatedOptions // Keep for backward compatibility
    });
  } catch (error: any) {
    console.error('Plan route error:', error);
    
    // Use the error handling utility for consistent responses
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      return handleApiError(error);
    }

    // Handle OpenAI-specific errors
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'AI service rate limit exceeded. Please try again in a moment.' },
        { status: 503 }
      );
    }

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'AI service authentication failed. Please check configuration.' },
        { status: 503 }
      );
    }

    if (error?.code === 'timeout' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'AI service request timed out. Please try again.' },
        { status: 504 }
      );
    }

    return handleApiError(error);
  }
}

