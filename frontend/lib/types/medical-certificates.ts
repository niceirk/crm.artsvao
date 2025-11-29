import { AttendanceStatus } from './attendance';

export interface MedicalCertificate {
  id: string;
  clientId: string;
  fileUrl: string;
  fileName?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  appliedSchedules?: MedicalCertificateSchedule[];
  _count?: {
    appliedSchedules: number;
  };
}

export interface MedicalCertificateSchedule {
  id: string;
  medicalCertificateId: string;
  scheduleId: string;
  attendanceId?: string;
  previousStatus?: AttendanceStatus;
  appliedAt: string;
  // Поля для компенсации
  subscriptionId?: string;
  compensationAmount?: number;
  compensationMonth?: string;
  schedule: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    group?: {
      id: string;
      name: string;
      studio?: {
        id: string;
        name: string;
      };
    };
  };
  attendance?: {
    id: string;
    status: AttendanceStatus;
  };
  subscription?: {
    id: string;
    subscriptionType: {
      name: string;
    };
  };
}

export interface SchedulePreview {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  group: {
    id: string;
    name: string;
    studio?: {
      id: string;
      name: string;
    };
  };
  currentAttendance?: {
    id: string;
    status: AttendanceStatus;
    subscriptionDeducted: boolean;
  } | null;
  subscription?: {
    id: string;
    name: string;
    type: 'UNLIMITED' | 'SINGLE_VISIT' | 'VISIT_PACK';
    pricePerLesson: number | null;
    validMonth: string;
    purchaseDate: string;
  } | null;
  compensationAmount?: number | null;
}

export interface CreateMedicalCertificateDto {
  clientId: string;
  startDate: string;
  endDate: string;
  notes?: string;
  scheduleIds?: string[];
  compensationMonths?: CompensationMonthDto[];
}

export interface UpdateMedicalCertificateDto {
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface MedicalCertificateFilter {
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface MedicalCertificatesResponse {
  items: MedicalCertificate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompensationMonthDto {
  subscriptionId: string;
  compensationMonth: string;
}

export interface ScheduleCompensationDto {
  scheduleId: string;
  subscriptionId?: string;
  compensationAmount?: number;
  compensationMonth?: string;
}

export interface ApplyToSchedulesDto {
  scheduleIds: string[];
  compensationMonths?: CompensationMonthDto[];
  scheduleCompensations?: ScheduleCompensationDto[];
}

export interface ApplyToSchedulesResponse {
  applied: number;
  results: Array<{
    scheduleId: string;
    attendanceId: string;
    previousStatus: AttendanceStatus | null;
    subscriptionId?: string;
    compensationAmount?: number;
    compensationMonth?: string;
  }>;
}

export interface AvailablePeriodsResponse {
  years: number[];
  months: Record<number, number[]>;
}
