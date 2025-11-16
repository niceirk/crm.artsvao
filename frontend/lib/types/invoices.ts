import type { ServiceType, WriteOffTiming } from './services';

export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type WriteOffStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type InvoiceAuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'PRICE_ADJUSTED'
  | 'STATUS_CHANGED'
  | 'ITEM_ADDED'
  | 'ITEM_REMOVED'
  | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  serviceId?: string;
  serviceType: ServiceType;
  serviceName: string;
  serviceDescription?: string;
  roomId?: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  vatRate: number;
  vatAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
  writeOffTiming: WriteOffTiming;
  writeOffStatus: WriteOffStatus;
  remainingQuantity?: number;
  isPriceAdjusted: boolean;
  adjustmentReason?: string;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    name: string;
  };
  room?: {
    id: string;
    name: string;
  };
}

export interface InvoiceAuditLog {
  id: string;
  invoiceId: string;
  itemId?: string;
  action: InvoiceAuditAction;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  subscriptionId?: string;
  rentalId?: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  createdBy?: string;
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
  items: InvoiceItem[];
  payments?: {
    id: string;
    amount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }[];
  rental?: {
    id: string;
    clientName: string;
    eventType: string;
    date: string;
  };
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  auditLogs?: InvoiceAuditLog[];
  _count?: {
    payments: number;
  };
}

export interface CreateInvoiceItemDto {
  serviceId?: string;
  serviceType: ServiceType;
  serviceName: string;
  serviceDescription?: string;
  roomId?: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  vatRate: number;
  discountPercent?: number;
  writeOffTiming: WriteOffTiming;
  isPriceAdjusted?: boolean;
  adjustmentReason?: string;
}

export interface CreateInvoiceDto {
  clientId: string;
  subscriptionId?: string;
  rentalId?: string;
  items: CreateInvoiceItemDto[];
  discountAmount?: number;
  dueDate?: string;
  notes?: string;
}

export interface UpdateInvoiceDto {
  status?: InvoiceStatus;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
}

export interface InvoiceFilterDto {
  clientId?: string;
  status?: InvoiceStatus;
  issuedAfter?: string;
  issuedBefore?: string;
  invoiceNumber?: string;
}
