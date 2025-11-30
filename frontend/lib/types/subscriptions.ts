import type { AttendanceStatus } from './attendance';

export type SubscriptionTypeEnum = 'UNLIMITED' | 'VISIT_PACK' | 'SINGLE_VISIT';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';

export interface SubscriptionAttendance {
  id: string;
  status: AttendanceStatus;
  notes?: string | null;
  markedAt?: string | null;
  markedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  subscriptionDeducted: boolean;
  subscription?: {
    id: string;
    remainingVisits?: number | null;
    subscriptionType: {
      id: string;
      name: string;
      type: SubscriptionTypeEnum;
    };
  } | null;
  schedule: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    group: {
      id: string;
      name: string;
      studio: {
        id: string;
        name: string;
      };
    };
  };
}

export interface SubscriptionType {
  id: string;
  version: number; // Версия для оптимистичной блокировки
  name: string;
  description?: string;
  groupId: string;
  type: SubscriptionTypeEnum;
  price: number;
  pricePerLesson?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  group: {
    id: string;
    name: string;
    studio: {
      id: string;
      name: string;
    };
  };
  _count?: {
    subscriptions: number;
  };
}

export interface Subscription {
  id: string;
  version: number; // Версия для оптимистичной блокировки
  clientId: string;
  subscriptionTypeId: string;
  groupId: string;
  validMonth: string; // Format: YYYY-MM
  purchaseDate: string;
  startDate: string;
  endDate: string;
  originalPrice: number;
  discountAmount: number;
  paidPrice: number;
  pricePerLesson?: number | null; // Цена за занятие (для расчёта компенсации)
  remainingVisits?: number;
  purchasedMonths: number;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    benefitCategory?: {
      id: string;
      name: string;
      discountPercent: number;
    };
  };
  group: {
    id: string;
    name: string;
    teacher?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    studio: {
      id: string;
      name: string;
    };
  };
  subscriptionType: SubscriptionType;
  invoices?: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    issuedAt: string;
  }[];
  attendances?: SubscriptionAttendance[];
}

export interface CreateSubscriptionTypeDto {
  name: string;
  description?: string;
  groupId: string;
  type: SubscriptionTypeEnum;
  price: number;
  pricePerLesson?: number;
  isActive?: boolean;
}

export interface UpdateSubscriptionTypeDto {
  version?: number; // Для защиты от перезатирания
  name?: string;
  description?: string;
  price?: number;
  pricePerLesson?: number;
  isActive?: boolean;
}

export interface SubscriptionTypeFilterDto {
  groupId?: string;
  isActive?: boolean;
  type?: SubscriptionTypeEnum;
  excludeTypes?: SubscriptionTypeEnum[];
  page?: number;
  limit?: number;
}

export interface SellSubscriptionDto {
  clientId: string;
  subscriptionTypeId: string;
  groupId: string;
  validMonth: string; // Format: YYYY-MM
  startDate: string; // Format: YYYY-MM-DD
  purchasedMonths?: number; // Default: 1
  notes?: string;
  applyBenefit?: boolean;
}

export interface UpdateSubscriptionDto {
  version: number; // Обязательно для защиты от перезатирания
  status?: SubscriptionStatus;
  remainingVisits?: number;
}

export interface SubscriptionFilterDto {
  clientId?: string;
  groupId?: string;
  status?: SubscriptionStatus;
  statusCategory?: 'ACTIVE' | 'INACTIVE';
  sortBy?: 'purchaseDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  validMonth?: string;
  page?: number;
  limit?: number;
}

export interface ValidateSubscriptionResponse {
  isValid: boolean;
  subscription: Subscription;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTO для продажи независимых услуг
export interface SellIndependentServiceDto {
  clientId: string;
  serviceId: string;
  quantity?: number;
  notes?: string;
}

// Результат продажи услуги
export interface ServiceSale {
  id: string;
  clientId: string;
  serviceId: string;
  quantity: number;
  originalPrice: number;
  paidPrice: number;
  vatRate: number;
  vatAmount: number;
  notes?: string;
  purchaseDate: string;
  managerId?: string;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
    category?: {
      id: string;
      name: string;
    };
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
