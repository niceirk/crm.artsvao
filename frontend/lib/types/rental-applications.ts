import type { Client } from './clients';
import type { Room } from '@/lib/api/rooms';
import type { Workspace } from '@/lib/api/workspaces';
import type { Invoice } from './invoices';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
}

export type RentalType =
  | 'HOURLY'
  | 'WORKSPACE_DAILY'
  | 'WORKSPACE_WEEKLY'
  | 'WORKSPACE_MONTHLY'
  | 'ROOM_DAILY'
  | 'ROOM_WEEKLY'
  | 'ROOM_MONTHLY';

export type RentalPeriodType =
  | 'HOURLY'
  | 'SPECIFIC_DAYS'
  | 'WEEKLY'
  | 'CALENDAR_MONTH'
  | 'SLIDING_MONTH';

export type PriceUnit = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';

export type RentalPaymentType = 'PREPAYMENT' | 'POSTPAYMENT';

export type RentalApplicationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface RentalApplicationWorkspace {
  id: string;
  rentalApplicationId: string;
  workspaceId: string;
  workspace: Workspace;
}

export interface RentalApplicationDay {
  id: string;
  rentalApplicationId: string;
  date: string;
}

export interface RentalApplication {
  id: string;
  applicationNumber: string;
  rentalType: RentalType;
  roomId: string | null;
  room: Room | null;
  clientId: string;
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'phone' | 'email'>;
  periodType: RentalPeriodType;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  basePrice: number;
  adjustedPrice: number | null;
  totalPrice: number;
  priceUnit: PriceUnit;
  quantity: number;
  adjustmentReason: string | null;
  paymentType: RentalPaymentType;
  status: RentalApplicationStatus;
  managerId: string | null;
  manager: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  notes: string | null;
  eventType: string | null;
  workspaces: RentalApplicationWorkspace[];
  selectedDays: RentalApplicationDay[];
  invoices: Invoice[];
  rentals?: any[];
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  _count?: {
    rentals: number;
    invoices: number;
  };
}

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

export interface CreateRentalApplicationDto {
  rentalType: RentalType;
  roomId?: string;
  workspaceIds?: string[];
  clientId: string;
  periodType: RentalPeriodType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  selectedDays?: string[];
  basePrice: number;
  adjustedPrice?: number;
  adjustmentReason?: string;
  priceUnit: PriceUnit;
  quantity?: number;
  paymentType?: RentalPaymentType;
  eventType?: string;
  notes?: string;
  ignoreConflicts?: boolean;
  hourlySlots?: HourlySlotDto[]; // Массив почасовых слотов для HOURLY
}

export interface UpdateRentalApplicationDto extends Partial<CreateRentalApplicationDto> {
  status?: RentalApplicationStatus;
}

export interface CheckAvailabilityDto {
  rentalType: RentalType;
  roomId?: string;
  workspaceIds?: string[];
  periodType: RentalPeriodType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  selectedDays?: string[];
  excludeApplicationId?: string;
}

export interface CalculatePriceDto {
  rentalType: RentalType;
  roomId?: string;
  workspaceIds?: string[];
  periodType: RentalPeriodType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  selectedDays?: string[];
}

export interface ExtendRentalDto {
  newStartDate: string;
  newEndDate?: string;
  startTime?: string;
  endTime?: string;
  adjustedPrice?: number;
  adjustmentReason?: string;
}

export interface CancelRentalDto {
  reason?: string;
}

export interface RentalApplicationFilters {
  status?: RentalApplicationStatus;
  rentalType?: RentalType;
  clientId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  // Дополнительные фильтры (клиентская фильтрация)
  invoiceStatus?: 'NONE' | 'PENDING' | 'PAID';
  bookingDateFrom?: string;
  bookingDateTo?: string;
}

// Вспомогательные функции
export const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  HOURLY: 'Почасовая аренда',
  WORKSPACE_DAILY: 'Рабочее место (день)',
  WORKSPACE_WEEKLY: 'Рабочее место (неделя)',
  WORKSPACE_MONTHLY: 'Рабочее место (месяц)',
  ROOM_DAILY: 'Кабинет (день)',
  ROOM_WEEKLY: 'Кабинет (неделя)',
  ROOM_MONTHLY: 'Кабинет (месяц)',
};

export const RENTAL_STATUS_LABELS: Record<RentalApplicationStatus, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждена',
  ACTIVE: 'Активна',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

export const RENTAL_STATUS_COLORS: Record<RentalApplicationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  HOUR: 'час',
  DAY: 'день',
  WEEK: 'неделя',
  MONTH: 'месяц',
};

export const PERIOD_TYPE_LABELS: Record<RentalPeriodType, string> = {
  HOURLY: 'Почасовая',
  SPECIFIC_DAYS: 'Конкретные дни',
  WEEKLY: 'Недельная',
  CALENDAR_MONTH: 'Календарный месяц',
  SLIDING_MONTH: 'Скользящий месяц',
};

// Интерфейс для почасовых временных слотов (используется в форме)
export interface HourlyTimeSlot {
  date: Date;
  startHour: number;   // 9-21
  startMinute: number; // 0, 15, 30, 45
  endHour: number;     // 9-22
  endMinute: number;   // 0, 15, 30, 45
}

// Интерфейс для занятых интервалов (от backend)
export interface OccupiedInterval {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  source?: 'rental' | 'schedule' | 'event' | 'reservation';
}

// Интерфейс для API почасовых слотов
export interface HourlySlotDto {
  date: string;      // ISO date "2025-01-15"
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
}

// Статус возможности редактирования заявки
export interface EditStatusResult {
  canEdit: boolean;
  reason?: string;
  invoiceStatus?: string;
  invoiceNumber?: string;
}
