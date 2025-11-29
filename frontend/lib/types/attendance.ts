import type { SubscriptionStatus, SubscriptionTypeEnum } from './subscriptions';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';

export interface Attendance {
  id: string;
  scheduleId: string;
  clientId: string;
  subscriptionId?: string;
  status: AttendanceStatus;
  notes?: string;
  subscriptionDeducted: boolean;
  markedBy?: string;
  markedAt?: string;
  createdAt: string;
  updatedAt?: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phone: string;
    email?: string;
    benefitCategory?: {
      id: string;
      name: string;
      discountPercent: number;
    };
  };
  schedule: {
    id: string;
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
  subscription?: {
    id: string;
    remainingVisits?: number;
    status: SubscriptionStatus;
    validMonth: string;
    endDate: string;
    subscriptionType: {
      id: string;
      name: string;
      type: SubscriptionTypeEnum;
    };
  };
  markedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface AttendanceStats {
  clientId: string;
  totalAttendances: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number; // Percentage
  lastAttendance?: string;
}

export interface CreateAttendanceDto {
  scheduleId: string;
  clientId: string;
  status: AttendanceStatus;
  subscriptionId?: string;
  notes?: string;
}

export interface UpdateAttendanceDto {
  status?: AttendanceStatus;
  subscriptionId?: string;
  notes?: string;
}

export interface AttendanceFilterDto {
  scheduleId?: string;
  groupId?: string;
  clientId?: string;
  status?: AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAttendanceResponse {
  data: Attendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceBaseOption {
  id: string;
  clientId: string;
  subscriptionType: {
    id: string;
    name: string;
    type: SubscriptionTypeEnum;
  };
  remainingVisits?: number | null;
  validMonth: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
}

export interface AttendanceBasesResponse {
  scheduleId: string;
  groupId: string | null;
  date: string;
  bases: AttendanceBaseOption[];
}

// Дополнительный интерфейс для списка клиентов с абонементами для UI
export interface ClientWithSubscription {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  subscription?: {
    id: string;
    type: 'UNLIMITED' | 'SINGLE_VISIT' | 'VISIT_PACK';
    remainingVisits?: number;
    status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';
    validMonth: string;
    startDate: string;
    endDate: string;
  };
  attendance?: Attendance; // Текущая отметка на этом занятии
}
