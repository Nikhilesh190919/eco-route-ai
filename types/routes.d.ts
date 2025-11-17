/**
 * Route mode types for transportation
 */
export type RouteMode = 'train' | 'bus' | 'flight' | 'car' | 'ferry' | 'train+bus' | 'bus+train';

/**
 * Route option interface representing a single travel route option
 */
export interface RouteOption {
  id?: string;
  mode: RouteMode;
  cost: number;
  durationMins: number;
  co2Kg: number; // Required - TypeScript will error if missing
  ecoScore: number;
  notes?: string;
}

/**
 * Trip interface representing a saved trip with route options
 */
export interface Trip {
  id: string;
  origin: string;
  destination: string;
  budget: number;
  dateStart: string;
  dateEnd: string;
  createdAt?: string;
  updatedAt?: string;
  routeOptions: RouteOption[]; // Required - TypeScript will error if missing
}

