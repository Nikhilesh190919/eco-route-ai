import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { createTripSchemaEnhanced, RouteOptionSchema } from '@/lib/validators';
import { handleApiError, AuthenticationError, ValidationError } from '@/lib/errors';
import type { Trip, RouteOption } from '@/types/routes';

/**
 * Normalize route option keys to match schema (co2Kg, durationMins, ecoScore)
 * Maps ferry and combinations to base RouteMode types
 * Returns RouteOption with required co2Kg field
 */
function normalizeRouteOption(option: any): RouteOption {
  // Map mode to base RouteMode type
  const rawMode = option.mode?.toLowerCase() || 'train';
  let mode: RouteOption['mode'];
  
  if (rawMode === 'train' || rawMode === 'bus' || rawMode === 'flight' || rawMode === 'car') {
    mode = rawMode;
  } else if (rawMode === 'ferry' || rawMode === 'boat' || rawMode === 'ship') {
    mode = 'car'; // Map ferry to car
  } else if (rawMode.includes('train') && rawMode.includes('bus')) {
    mode = 'train'; // Map combinations to train
  } else if (rawMode.includes('train')) {
    mode = 'train';
  } else if (rawMode.includes('bus')) {
    mode = 'bus';
  } else if (rawMode.includes('flight') || rawMode.includes('airplane') || rawMode.includes('plane')) {
    mode = 'flight';
  } else {
    mode = 'train'; // Default fallback
  }
  
  // Handle various key naming conventions
  const normalized: RouteOption = {
    id: option.id,
    mode,
    cost: Number(option.cost ?? option.costUSD ?? option.price ?? 0),
    durationMins: Number(option.durationMins ?? option.durationMinutes ?? option.duration ?? 0),
    co2Kg: Number(option.co2Kg ?? option.co2 ?? option.co2kg ?? option.co2_kg ?? 0), // Required - TypeScript will error if missing
    ecoScore: Number(option.ecoScore ?? option.ecoscore ?? option.eco_score ?? option.score ?? 0),
  };

  // Add notes if present
  if (option.notes) {
    normalized.notes = option.notes;
  }

  return normalized;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError('You must be signed in to view trips');
    }

    const trips = await prisma.trip.findMany({
      where: { createdBy: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { options: true },
    });

    // Normalize and validate route options for each trip
    const normalizedTrips = trips.map((trip) => {
      const normalizedOptions = (trip.options || []).map((option) => {
        // Normalize keys first
        const normalized = normalizeRouteOption({
          id: option.id,
          mode: option.mode,
          cost: option.cost,
          durationMins: option.durationMins,
          co2Kg: option.co2Kg,
          ecoScore: option.ecoScore,
          notes: option.notes,
        });

        // Validate with schema (but don't fail if validation fails - just log and use normalized)
        const validation = RouteOptionSchema.safeParse(normalized);
        if (!validation.success) {
          console.warn('Route option validation failed in GET /api/trips:', {
            tripId: trip.id,
            optionId: option.id,
            errors: validation.error.errors,
            normalized,
          });
        }

        return validation.success ? validation.data : normalized;
      });

      const tripResponse: Trip = {
        id: trip.id,
        origin: trip.origin,
        destination: trip.destination,
        budget: trip.budget,
        dateStart: trip.dateStart.toISOString(),
        dateEnd: trip.dateEnd.toISOString(),
        createdAt: trip.createdAt.toISOString(),
        updatedAt: trip.updatedAt.toISOString(),
        routeOptions: normalizedOptions, // Required - TypeScript will error if missing
      };
      
      return tripResponse;
    });

    return NextResponse.json({ trips: normalizedTrips });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError('You must be signed in to create trips');
    }

    const body = await req.json();
    const parsed = createTripSchemaEnhanced.safeParse(body);
    
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      throw new ValidationError('Invalid trip data', errors);
    }

    const { origin, destination, budget, dateRange } = parsed.data;
    const routeOptions = body.routeOptions as RouteOption[] | undefined;
    
    // Create trip
    const trip = await prisma.trip.create({
      data: {
        origin,
        destination,
        budget,
        dateStart: new Date(dateRange.start),
        dateEnd: new Date(dateRange.end),
        createdBy: session.user.id,
      }
    });

    // Save route options if provided
    if (routeOptions && Array.isArray(routeOptions) && routeOptions.length > 0) {
      console.log(`[Create Trip] Saving ${routeOptions.length} route options for trip ${trip.id}`);
      
      // Validate and save each route option
      const validatedOptions = [];
      for (const option of routeOptions) {
        const normalized = normalizeRouteOption(option);
        const validation = RouteOptionSchema.safeParse(normalized);
        
        if (validation.success) {
          validatedOptions.push(validation.data);
        } else {
          console.warn('[Create Trip] Route option validation failed:', {
            option,
            errors: validation.error.errors,
          });
        }
      }

      if (validatedOptions.length > 0) {
        await prisma.routeOption.createMany({
          data: validatedOptions.map((option) => ({
            tripId: trip.id,
            mode: option.mode,
            cost: Math.round(option.cost),
            durationMins: option.durationMins,
            co2Kg: option.co2Kg,
            ecoScore: option.ecoScore,
          })),
        });
        console.log(`[Create Trip] Saved ${validatedOptions.length} route options`);
      }
    }

    // Fetch trip with options
    const tripWithOptions = await prisma.trip.findUnique({
      where: { id: trip.id },
      include: { options: true },
    });

    return NextResponse.json({ trip: tripWithOptions }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

