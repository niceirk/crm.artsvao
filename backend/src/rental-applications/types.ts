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

export interface OccupiedInterval {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  source: 'rental' | 'schedule' | 'event' | 'reservation';
}

export interface HourlyOccupancyResponse {
  slots: Record<string, boolean>;
  detailed: Record<string, OccupiedInterval[]>;
}
