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
    type: string;
    remainingVisits?: number;
    status: string;
    validMonth: string;
    endDate: string;
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
  notes?: string;
}

export interface UpdateAttendanceDto {
  status?: AttendanceStatus;
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

// Дополнительный интерфейс для списка клиентов с абонементами для UI
export interface ClientWithSubscription {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  subscription?: {
    id: string;
    type: 'UNLIMITED' | 'SINGLE_VISIT';
    remainingVisits?: number;
    status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';
    validMonth: string;
    startDate: string;
    endDate: string;
  };
  attendance?: Attendance; // Текущая отметка на этом занятии
}
