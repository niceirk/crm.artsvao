import type { AttendanceStatus } from './attendance';

export type SubscriptionTypeEnum = 'UNLIMITED' | 'SINGLE_VISIT';

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
  name: string;
  description?: string;
  groupId: string;
  type: SubscriptionTypeEnum;
  price: number;
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
  isActive?: boolean;
}

export interface UpdateSubscriptionTypeDto {
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
}

export interface SubscriptionTypeFilterDto {
  groupId?: string;
  isActive?: boolean;
  type?: SubscriptionTypeEnum;
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
