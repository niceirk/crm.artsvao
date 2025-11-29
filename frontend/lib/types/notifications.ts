// Enums
export enum NotificationChannel {
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export enum NotificationEventType {
  LESSON_CANCELLED = 'LESSON_CANCELLED',
  LESSON_RESCHEDULED = 'LESSON_RESCHEDULED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  MASS_BROADCAST = 'MASS_BROADCAST',
  SUBSCRIPTION_PURCHASED = 'SUBSCRIPTION_PURCHASED',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  ATTENDANCE_MARKED = 'ATTENDANCE_MARKED',
  CLIENT_CREATED = 'CLIENT_CREATED',
  CLIENT_WELCOME = 'CLIENT_WELCOME',
}

export enum NotificationInitiator {
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
  MASS_SEND = 'MASS_SEND',
  SCHEDULED = 'SCHEDULED',
}

// Шаблоны уведомлений
export interface NotificationTemplate {
  id: string;
  code: string;
  channel: NotificationChannel;
  name: string;
  description?: string;
  subject?: string;
  body: string;
  variablesSchema?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDto {
  code: string;
  channel: NotificationChannel;
  name: string;
  description?: string;
  subject?: string;
  body: string;
  variablesSchema?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  subject?: string;
  body?: string;
  variablesSchema?: Record<string, any>;
  isActive?: boolean;
}

// Уведомления
export interface Notification {
  id: string;
  recipientId?: string;
  channel: NotificationChannel;
  recipientAddress: string;
  eventType: NotificationEventType;
  templateId?: string;
  payload?: Record<string, any>;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  externalId?: string;
  initiator: NotificationInitiator;
  initiatorId?: string;
  scheduledFor?: string;
  sentAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  template?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateNotificationDto {
  recipientId?: string;
  channel: NotificationChannel;
  recipientAddress: string;
  eventType: NotificationEventType;
  templateCode: string;
  payload?: Record<string, any>;
  initiator?: NotificationInitiator;
  initiatorId?: string;
  scheduledFor?: string;
}

// Массовые рассылки
export interface MassSendFilters {
  groupId?: string;
  studioId?: string;
  clientStatus?: string;
  clientIds?: string[];
}

export interface MassSendDto {
  channel: NotificationChannel;
  templateCode: string;
  payload?: Record<string, any>;
  filters: MassSendFilters;
  testMode?: boolean;
}

export interface MassSendResult {
  queued: number;
  skipped: number;
  total: number;
  testMode: boolean;
}

// Запросы с фильтрацией
export interface NotificationQuery {
  status?: NotificationStatus;
  channel?: NotificationChannel;
  eventType?: NotificationEventType;
  recipientId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TemplateQuery {
  channel?: NotificationChannel;
  isActive?: boolean;
}

// Статистика
export interface NotificationStats {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  byEventType: Record<string, number>;
}

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  rateLimits: {
    telegramSentThisSecond: number;
    emailSentThisHour: number;
    emailSentToday: number;
  };
}

// Пагинированный ответ
export interface PaginatedNotifications {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Предпросмотр шаблона
export interface TemplatePreview {
  subject?: string;
  body: string;
  format: 'text' | 'html';
}

// Русские названия
export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.TELEGRAM]: 'Telegram',
  [NotificationChannel.EMAIL]: 'Email',
};

export const STATUS_LABELS: Record<NotificationStatus, string> = {
  [NotificationStatus.PENDING]: 'Ожидает',
  [NotificationStatus.PROCESSING]: 'Отправляется',
  [NotificationStatus.SENT]: 'Отправлено',
  [NotificationStatus.FAILED]: 'Ошибка',
  [NotificationStatus.CANCELED]: 'Отменено',
};

export const EVENT_TYPE_LABELS: Record<NotificationEventType, string> = {
  [NotificationEventType.LESSON_CANCELLED]: 'Отмена занятия',
  [NotificationEventType.LESSON_RESCHEDULED]: 'Перенос занятия',
  [NotificationEventType.INVOICE_CREATED]: 'Создан счёт',
  [NotificationEventType.PAYMENT_SUCCESS]: 'Успешная оплата',
  [NotificationEventType.MASS_BROADCAST]: 'Массовая рассылка',
  [NotificationEventType.SUBSCRIPTION_PURCHASED]: 'Покупка абонемента',
  [NotificationEventType.SUBSCRIPTION_EXPIRING]: 'Истекает абонемент',
  [NotificationEventType.SUBSCRIPTION_EXPIRED]: 'Истёк абонемент',
  [NotificationEventType.ATTENDANCE_MARKED]: 'Отметка посещения',
  [NotificationEventType.CLIENT_CREATED]: 'Создан клиент',
  [NotificationEventType.CLIENT_WELCOME]: 'Приветствие клиента',
};

export const INITIATOR_LABELS: Record<NotificationInitiator, string> = {
  [NotificationInitiator.SYSTEM]: 'Система',
  [NotificationInitiator.ADMIN]: 'Администратор',
  [NotificationInitiator.MASS_SEND]: 'Массовая рассылка',
  [NotificationInitiator.SCHEDULED]: 'Планировщик',
};
