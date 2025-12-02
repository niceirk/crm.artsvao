import { PriceUnit } from '@prisma/client';

export interface ConflictInfo {
  date: string;
  type: 'schedule' | 'rental' | 'event' | 'reservation';
  description: string;
  startTime?: string;
  endTime?: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: ConflictInfo[];
}

export interface PriceCalculation {
  basePrice: number;
  quantity: number;
  priceUnit: PriceUnit;
  totalPrice: number;
  breakdown?: {
    date?: string;
    price: number;
  }[];
}
