import { apiClient } from './client';
import type {
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilterDto,
} from '../types/invoices';

export const invoicesApi = {
  getAll: async (filter?: InvoiceFilterDto): Promise<Invoice[]> => {
    const params = new URLSearchParams();
    if (filter?.clientId) params.append('clientId', filter.clientId);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.issuedAfter) params.append('issuedAfter', filter.issuedAfter);
    if (filter?.issuedBefore) params.append('issuedBefore', filter.issuedBefore);
    if (filter?.invoiceNumber) params.append('invoiceNumber', filter.invoiceNumber);
    if (filter?.clientSearch) params.append('clientSearch', filter.clientSearch);
    if (filter?.sortBy) params.append('sortBy', filter.sortBy);
    if (filter?.sortOrder) params.append('sortOrder', filter.sortOrder);
    // Remove default 20 limit - fetch all invoices
    params.append('limit', '1000');

    const query = params.toString();
    const url = `/invoices?${query}`;

    const response = await apiClient.get<{ data: Invoice[]; meta: any }>(url);
    return response.data.data;
  },

  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  getByClient: async (clientId: string): Promise<Invoice[]> => {
    const response = await apiClient.get<Invoice[]>(`/invoices/client/${clientId}`);
    return response.data;
  },

  create: async (data: CreateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices', data);
    return response.data;
  },

  update: async (id: string, data: UpdateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.patch<Invoice>(`/invoices/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`);
  },

  // QR Code methods
  getQRCodeDataURL: async (id: string): Promise<{
    dataUrl: string;
    paymentData: {
      Name: string;
      Sum: number;
      Purpose: string;
      [key: string]: any;
    };
  }> => {
    const response = await apiClient.get(`/invoices/${id}/qr-data-url`);
    return response.data;
  },

  getQRCodeBlob: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/invoices/${id}/qr`, {
      responseType: 'blob',
    });
    return response.data;
  },

  sendQREmail: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/invoices/${id}/send-qr-email`);
    return response.data;
  },

  markAsPaid: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/mark-paid`);
    return response.data;
  },
};
