export interface BaseNotificationPayload {
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
}

export interface LessonNotificationPayload extends BaseNotificationPayload {
  groupName: string;
  date: string;
  time: string;
  roomName?: string;
  teacherName?: string;
  reason?: string;
}

export interface InvoiceNotificationPayload extends BaseNotificationPayload {
  invoiceNumber: string;
  amount: string;
  paymentLink?: string;
  items?: string;
}

export interface PaymentNotificationPayload extends BaseNotificationPayload {
  amount: string;
  paymentMethod?: string;
  invoiceNumber?: string;
}

export interface SubscriptionNotificationPayload extends BaseNotificationPayload {
  subscriptionName: string;
  groupName: string;
  startDate: string;
  endDate: string;
  remainingVisits?: number;
  totalVisits?: number;
}

export interface MassBroadcastPayload extends BaseNotificationPayload {
  customMessage?: string;
}

export type NotificationPayload =
  | LessonNotificationPayload
  | InvoiceNotificationPayload
  | PaymentNotificationPayload
  | SubscriptionNotificationPayload
  | MassBroadcastPayload
  | Record<string, any>;
