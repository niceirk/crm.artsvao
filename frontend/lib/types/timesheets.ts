export interface TimesheetFilterDto {
  studioId?: string;
  groupId?: string;
  month?: string; // Формат: "2025-11"
}

export interface UpdateCompensationDto {
  adjustedAmount?: number;
  notes?: string;
}

export interface TimesheetAttendance {
  date: string;
  scheduleId: string;
  attendanceId: string | null;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | null;
  subscriptionName: string | null;
  isFromMedicalCertificate: boolean; // Статус установлен по медицинской справке (не редактируется)
}

export interface TimesheetSummary {
  total: number;
  present: number;
  absent: number;
  excused: number;
  notMarked: number;
}

export interface TimesheetCompensation {
  id?: string;
  excusedCount: number;
  calculatedAmount: number;
  baseCalculatedAmount?: number; // Компенсация за текущий месяц (excused * pricePerLesson)
  medCertCompensation?: number; // Компенсация из мед. справок (перенесённая с других месяцев)
  adjustedAmount: number | null;
  pricePerLesson: number;
  notes?: string;
  appliedToInvoiceId?: string;
}

export interface TimesheetSubscription {
  id: string;
  name: string;
  type: 'UNLIMITED' | 'VISIT_PACK';
  price: number;
}

export interface TimesheetMedicalCertificate {
  id: string;
  startDate: string;
  endDate: string;
}

export interface TimesheetClient {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phone: string;
  memberStatus: 'ACTIVE' | 'WAITLIST' | 'EXPELLED';
  attendances: TimesheetAttendance[];
  summary: TimesheetSummary;
  compensation: TimesheetCompensation;
  subscription: TimesheetSubscription | null;
  nextMonthInvoice: number | null;
  benefitDiscount: number | null;
  medicalCertificates: TimesheetMedicalCertificate[];
}

export interface TimesheetScheduleDate {
  date: string;
  scheduleId: string;
  dayOfWeek: string;
  startTime: string;
}

export interface TimesheetGroup {
  id: string;
  name: string;
  studio: {
    id: string;
    name: string;
  };
}

export interface TimesheetTotals {
  totalClients: number;
  totalSchedules: number;
  totalCompensation: number;
}

export interface TimesheetResponse {
  group: TimesheetGroup;
  month: string;
  scheduleDates: TimesheetScheduleDate[];
  clients: TimesheetClient[];
  totals: TimesheetTotals;
}

export interface Studio {
  id: string;
  name: string;
}

export interface GroupForFilter {
  id: string;
  name: string;
  studio: {
    id: string;
    name: string;
  };
}

export interface Compensation {
  id: string;
  clientId: string;
  groupId: string;
  month: string;
  excusedCount: number;
  calculatedAmount: number;
  adjustedAmount: number | null;
  notes: string | null;
  appliedToInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}
