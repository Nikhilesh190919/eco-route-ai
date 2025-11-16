import { z } from 'zod';

export const planSchema = z.object({
  origin: z.string().min(2, 'Origin is required'),
  destination: z.string().min(2, 'Destination is required'),
  budget: z.number().int().positive('Budget must be positive'),
});

export const createTripSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  budget: z.number().int().positive(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const planSchemaEnhanced = z.object({
  origin: z.string().min(2, 'Origin must be at least 2 characters').max(100, 'Origin is too long'),
  destination: z.string().min(2, 'Destination must be at least 2 characters').max(100, 'Destination is too long'),
  budget: z.number().int().positive('Budget must be a positive number').max(10000, 'Budget cannot exceed $10,000'),
}).refine((data) => data.origin.toLowerCase().trim() !== data.destination.toLowerCase().trim(), {
  message: 'Origin and destination must be different',
  path: ['destination'],
});

export const createTripSchemaEnhanced = z.object({
  origin: z.string().min(2, 'Origin must be at least 2 characters').max(100, 'Origin is too long'),
  destination: z.string().min(2, 'Destination must be at least 2 characters').max(100, 'Destination is too long'),
  budget: z.number().int().positive('Budget must be a positive number').max(10000, 'Budget cannot exceed $10,000'),
  dateRange: z.object({
    start: z.string().min(1, 'Start date is required'),
    end: z.string().min(1, 'End date is required'),
  }).refine((data) => {
    const start = new Date(data.start);
    const end = new Date(data.end);
    return start <= end;
  }, {
    message: 'End date must be after or equal to start date',
    path: ['end'],
  }),
}).refine((data) => data.origin.toLowerCase().trim() !== data.destination.toLowerCase().trim(), {
  message: 'Origin and destination must be different',
  path: ['destination'],
});

export const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  theme: z.enum(['light', 'dark', 'system'], {
    errorMap: () => ({ message: 'Theme must be light, dark, or system' }),
  }),
});

// RouteOption schema for validating route options
export const RouteOptionSchema = z.object({
  id: z.string().optional(),
  mode: z.enum(['train', 'bus', 'flight', 'car', 'ferry', 'train+bus', 'bus+train'], {
    errorMap: () => ({ message: 'Mode must be train, bus, flight, car, ferry, or combination' }),
  }),
  cost: z.number().nonnegative('Cost must be non-negative').finite('Cost must be a finite number'),
  durationMins: z.number().int().nonnegative('Duration must be a non-negative integer').finite('Duration must be a finite number'),
  co2Kg: z.number().nonnegative('CO2 must be non-negative').finite('CO2 must be a finite number'),
  ecoScore: z.number().int().min(0, 'Eco score must be between 0 and 100').max(100, 'Eco score must be between 0 and 100'),
  notes: z.string().optional(),
}).strict(); // Strict mode to catch extra properties

// Trip schema that includes routeOptions
export const TripSchema = z.object({
  id: z.string(),
  origin: z.string(),
  destination: z.string(),
  budget: z.number().int().positive(),
  dateStart: z.string().or(z.date()),
  dateEnd: z.string().or(z.date()),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  routeOptions: z.array(RouteOptionSchema).default([]),
});

export type PlanInput = z.infer<typeof planSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type RouteOption = z.infer<typeof RouteOptionSchema>;
export type Trip = z.infer<typeof TripSchema>;

