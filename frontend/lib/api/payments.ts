import { apiClient } from './client';
import type {
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentFilterDto,
  PaginatedResponse,
} from '../types/payments';

export const paymentsApi = {
  create: async (data: CreatePaymentDto): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/payments', data);
    return response.data;
  },

  getAll: async (
    filter?: PaymentFilterDto,
  ): Promise<PaginatedResponse<Payment>> => {
    const params = new URLSearchParams();
    if (filter?.clientId) params.append('clientId', filter.clientId);
    if (filter?.invoiceId) params.append('invoiceId', filter.invoiceId);
    if (filter?.subscriptionId)
      params.append('subscriptionId', filter.subscriptionId);
    if (filter?.rentalId) params.append('rentalId', filter.rentalId);
    if (filter?.paymentMethod)
      params.append('paymentMethod', filter.paymentMethod);
    if (filter?.paymentType) params.append('paymentType', filter.paymentType);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.dateFrom) params.append('dateFrom', filter.dateFrom);
    if (filter?.dateTo) params.append('dateTo', filter.dateTo);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.limit) params.append('limit', String(filter.limit));

    const query = params.toString();
    const url = query ? `/payments?${query}` : '/payments';

    const response = await apiClient.get<PaginatedResponse<Payment>>(url);
    return response.data;
  },

  getById: async (id: string): Promise<Payment> => {
    const response = await apiClient.get<Payment>(`/payments/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdatePaymentDto): Promise<Payment> => {
    const response = await apiClient.patch<Payment>(`/payments/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/payments/${id}`);
  },
};
