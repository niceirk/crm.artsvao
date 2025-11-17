export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE';

export type PaymentType = 'SUBSCRIPTION' | 'RENTAL' | 'SINGLE_VISIT';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  status: PaymentStatus;
  transactionId?: string;
  subscriptionId?: string;
  rentalId?: string;
  invoiceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    issuedAt: string;
  };
  subscription?: {
    id: string;
    validMonth: string;
    subscriptionType: {
      id: string;
      name: string;
    };
  };
  rental?: {
    id: string;
    rentalDate: string;
    room: {
      id: string;
      name: string;
    };
  };
}

export interface CreatePaymentDto {
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  invoiceId?: string;
  subscriptionId?: string;
  rentalId?: string;
  notes?: string;
  transactionId?: string;
  paidAt?: string;
}

export interface UpdatePaymentDto {
  status?: PaymentStatus;
  notes?: string;
  transactionId?: string;
}

export interface PaymentFilterDto {
  clientId?: string;
  invoiceId?: string;
  subscriptionId?: string;
  rentalId?: string;
  paymentMethod?: PaymentMethod;
  paymentType?: PaymentType;
  status?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  ONLINE: 'Онлайн',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  SUBSCRIPTION: 'Абонемент',
  RENTAL: 'Аренда',
  SINGLE_VISIT: 'Разовое посещение',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Ожидание',
  COMPLETED: 'Завершен',
  FAILED: 'Неудача',
  REFUNDED: 'Возврат',
};
