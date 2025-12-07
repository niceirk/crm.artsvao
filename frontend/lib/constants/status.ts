/**
 * Единая система статусов для CRM Artsvao
 *
 * Семантическая цветовая система:
 * - success: emerald - активные/успешные состояния
 * - warning: amber - ожидание/предупреждение
 * - error: red - ошибки/отмены
 * - info: blue - информационные/подтверждённые
 * - neutral: gray - нейтральные/завершённые
 */

import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  FileText,
  Play,
  CheckSquare,
  RotateCcw,
  UserCheck,
  UserX,
  Star,
  Check,
  X,
  AlertCircle,
  Loader2,
  Ban,
} from 'lucide-react';

// Re-export типов статусов из существующих файлов
export type { InvoiceStatus } from '@/lib/types/invoices';
export type { SubscriptionStatus } from '@/lib/types/subscriptions';
export type { RentalApplicationStatus } from '@/lib/types/rental-applications';
export type { PaymentStatus } from '@/lib/types/payments';
export type { ClientStatus } from '@/lib/types/clients';
export type { AttendanceStatus } from '@/lib/types/attendance';
export { NotificationStatus } from '@/lib/types/notifications';

// === Семантические типы ===
export type StatusSemantic = 'success' | 'warning' | 'error' | 'info' | 'neutral';

// === Конфигурация статуса ===
export interface StatusConfig {
  label: string;
  semantic: StatusSemantic;
  icon: LucideIcon;
}

// === INVOICE STATUSES ===
export const INVOICE_STATUS_CONFIG: Record<string, StatusConfig> = {
  UNPAID: {
    label: 'Не оплачен',
    semantic: 'error',
    icon: XCircle,
  },
  PAID: {
    label: 'Оплачен',
    semantic: 'success',
    icon: CheckCircle,
  },
  PARTIALLY_PAID: {
    label: 'Частично оплачен',
    semantic: 'info',
    icon: Clock,
  },
};

// === SUBSCRIPTION STATUSES ===
export const SUBSCRIPTION_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: {
    label: 'Активен',
    semantic: 'success',
    icon: CheckCircle,
  },
  EXPIRED: {
    label: 'Истёк',
    semantic: 'neutral',
    icon: Clock,
  },
  FROZEN: {
    label: 'Заморожен',
    semantic: 'warning',
    icon: Pause,
  },
  CANCELLED: {
    label: 'Отменён',
    semantic: 'error',
    icon: XCircle,
  },
};

// === RENTAL APPLICATION STATUSES ===
export const RENTAL_APPLICATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: {
    label: 'Черновик',
    semantic: 'neutral',
    icon: FileText,
  },
  PENDING: {
    label: 'Ожидает',
    semantic: 'warning',
    icon: Clock,
  },
  CONFIRMED: {
    label: 'Подтверждена',
    semantic: 'info',
    icon: CheckCircle,
  },
  ACTIVE: {
    label: 'Активна',
    semantic: 'success',
    icon: Play,
  },
  COMPLETED: {
    label: 'Завершена',
    semantic: 'neutral',
    icon: CheckSquare,
  },
  CANCELLED: {
    label: 'Отменена',
    semantic: 'error',
    icon: XCircle,
  },
};

// === PAYMENT STATUSES ===
export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Ожидание',
    semantic: 'warning',
    icon: Clock,
  },
  COMPLETED: {
    label: 'Завершён',
    semantic: 'success',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Неудача',
    semantic: 'error',
    icon: XCircle,
  },
  REFUNDED: {
    label: 'Возврат',
    semantic: 'neutral',
    icon: RotateCcw,
  },
};

// === CLIENT STATUSES ===
export const CLIENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: {
    label: 'Активен',
    semantic: 'success',
    icon: UserCheck,
  },
  INACTIVE: {
    label: 'Неактивен',
    semantic: 'neutral',
    icon: UserX,
  },
  VIP: {
    label: 'VIP',
    semantic: 'info',
    icon: Star,
  },
};

// === ATTENDANCE STATUSES ===
export const ATTENDANCE_STATUS_CONFIG: Record<string, StatusConfig> = {
  PRESENT: {
    label: 'Присутствовал',
    semantic: 'success',
    icon: Check,
  },
  ABSENT: {
    label: 'Пропустил',
    semantic: 'error',
    icon: X,
  },
  EXCUSED: {
    label: 'Уважительно',
    semantic: 'warning',
    icon: AlertCircle,
  },
};

// === NOTIFICATION STATUSES ===
export const NOTIFICATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Ожидает',
    semantic: 'warning',
    icon: Clock,
  },
  PROCESSING: {
    label: 'Отправляется',
    semantic: 'info',
    icon: Loader2,
  },
  SENT: {
    label: 'Отправлено',
    semantic: 'success',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Ошибка',
    semantic: 'error',
    icon: XCircle,
  },
  CANCELED: {
    label: 'Отменено',
    semantic: 'neutral',
    icon: Ban,
  },
};

// === HELPER FUNCTIONS ===

/**
 * Получить конфигурацию статуса по типу сущности
 */
export function getStatusConfig(
  entityType: 'invoice' | 'subscription' | 'rental' | 'payment' | 'client' | 'attendance' | 'notification',
  status: string
): StatusConfig | undefined {
  const configs: Record<string, Record<string, StatusConfig>> = {
    invoice: INVOICE_STATUS_CONFIG,
    subscription: SUBSCRIPTION_STATUS_CONFIG,
    rental: RENTAL_APPLICATION_STATUS_CONFIG,
    payment: PAYMENT_STATUS_CONFIG,
    client: CLIENT_STATUS_CONFIG,
    attendance: ATTENDANCE_STATUS_CONFIG,
    notification: NOTIFICATION_STATUS_CONFIG,
  };

  return configs[entityType]?.[status];
}

/**
 * Получить все статусы для конкретной сущности
 */
export function getEntityStatuses(
  entityType: 'invoice' | 'subscription' | 'rental' | 'payment' | 'client' | 'attendance' | 'notification'
): Record<string, StatusConfig> {
  const configs: Record<string, Record<string, StatusConfig>> = {
    invoice: INVOICE_STATUS_CONFIG,
    subscription: SUBSCRIPTION_STATUS_CONFIG,
    rental: RENTAL_APPLICATION_STATUS_CONFIG,
    payment: PAYMENT_STATUS_CONFIG,
    client: CLIENT_STATUS_CONFIG,
    attendance: ATTENDANCE_STATUS_CONFIG,
    notification: NOTIFICATION_STATUS_CONFIG,
  };

  return configs[entityType] || {};
}
