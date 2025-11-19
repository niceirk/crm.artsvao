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

    const query = params.toString();
    const url = query ? `/invoices?${query}` : '/invoices';

    const response = await apiClient.get<Invoice[]>(url);
    return response.data;
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
};
