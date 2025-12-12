export interface TimesheetFilterDto {
  studioId?: string;
  groupId?: string;
  month?: string; // Формат: "2025-11"
}

export interface UpdateCompensationDto {
  adjustedAmount?: number | null;  // null = сбросить ручную корректировку
  notes?: string;
  // Флаги включения компонентов перерасчёта
  includeExcused?: boolean;
  includeMedCert?: boolean;
  includeCancelled?: boolean;
  // Исключённые счета из задолженности
  excludedInvoiceIds?: string[];
  // Детализация расчёта (для истории)
  baseAmount?: number;
  medCertAmount?: number;
  cancelledAmount?: number;
  debtAmount?: number;
}

export interface TimesheetAttendance {
  date: string;
  scheduleId: string;
  attendanceId: string | null;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | null;
  subscriptionName: string | null;
  isFromMedicalCertificate: boolean; // Статус установлен по медицинской справке (не редактируется)
  isScheduleCancelled: boolean; // Занятие отменено (с компенсацией) - нельзя редактировать
  cancellationNote: string | null; // Причина отмены занятия
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
  effectiveRecalculationAmount?: number; // Итоговый перерасчёт с учётом настроек
  baseCalculatedAmount?: number; // Компенсация за текущий месяц (excused * pricePerLesson)
  medCertCompensation?: number; // Компенсация из мед. справок (перенесённая с других месяцев)
  cancelledLessonsCompensation?: number; // Компенсация за отменённые занятия
  debtAmount?: number; // Задолженность (неоплаченные счета по группе)
  adjustedAmount: number | null;
  pricePerLesson: number;
  notes?: string;
  appliedToInvoiceId?: string;
  // Настройки перерасчёта (из БД)
  includeExcused?: boolean;
  includeMedCert?: boolean;
  includeCancelled?: boolean;
  excludedInvoiceIds?: string[];
  // Сохранённая детализация
  savedBaseAmount?: number | null;
  savedMedCertAmount?: number | null;
  savedCancelledAmount?: number | null;
  savedDebtAmount?: number | null;
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
  status?: string;
  isCompensated?: boolean;
  cancellationNote?: string;
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

// Типы для импорта посещаемости
export interface ImportAttendanceRowResult {
  row: number;
  fio: string;
  dateTime: string;
  status: 'imported' | 'skipped' | 'conflict' | 'client_not_found' | 'schedule_not_found';
  message: string;
  existingStatus?: string;
  newStatus?: string;
  // ID для разрешения конфликтов
  attendanceId?: string;
  scheduleId?: string;
  clientId?: string;
  // Кандидаты для ручной привязки
  possibleClients?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
  }>;
}

export interface ImportAttendanceSummary {
  total: number;
  imported: number;
  skipped: number;
  conflicts: number;  // НОВОЕ ПОЛЕ
  clientNotFound: number;
  scheduleNotFound: number;
}

export interface ImportAttendanceResult {
  success: boolean;
  summary: ImportAttendanceSummary;
  results: ImportAttendanceRowResult[];
}

// Новые типы для разрешения конфликтов
export type ConflictResolutionType = 'keep_crm' | 'use_file' | 'skip';

export interface ConflictResolutionItem {
  attendanceId?: string;
  scheduleId?: string;
  clientId: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  resolution: ConflictResolutionType;
}

export interface ResolveImportConflictsDto {
  resolutions: ConflictResolutionItem[];
}

export interface ResolveImportConflictsResult {
  updated: number;
  created: number;
  skipped: number;
}

// Типы для детализации перерасчёта
export interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: 'PENDING' | 'OVERDUE' | 'PARTIALLY_PAID';
  issuedAt: string;
  period: string;
}

export interface CancelledSchedule {
  id: string;
  date: string;
  note: string | null;
}

export interface RecalculationDetailsCompensation {
  id: string;
  excusedCount: number;
  calculatedAmount: number;
  adjustedAmount: number | null;
  notes: string | null;
  includeExcused: boolean;
  includeMedCert: boolean;
  includeCancelled: boolean;
  excludedInvoiceIds: string[];
  baseAmount: number | null;
  medCertAmount: number | null;
  cancelledAmount: number | null;
  debtAmount: number | null;
}

export interface RecalculationDetails {
  compensation: RecalculationDetailsCompensation | null;
  unpaidInvoices: UnpaidInvoice[];
  cancelledSchedules: CancelledSchedule[];
}
