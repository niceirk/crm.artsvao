import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import type {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentFilterDto,
} from '@/lib/types/payments';
import { toast } from 'sonner';

export const usePayments = (filters?: PaymentFilterDto) => {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsApi.getAll(filters),
  });
};

export const usePayment = (id: string) => {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.getById(id),
    enabled: !!id,
  });
};

export const useClientPayments = (clientId: string) => {
  return useQuery({
    queryKey: ['payments', 'client', clientId],
    queryFn: () => paymentsApi.getAll({ clientId }),
    enabled: !!clientId,
  });
};

export const useInvoicePayments = (invoiceId: string) => {
  return useQuery({
    queryKey: ['payments', 'invoice', invoiceId],
    queryFn: () => paymentsApi.getAll({ invoiceId }),
    enabled: !!invoiceId,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentDto) => paymentsApi.create(data),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({
        queryKey: ['payments', 'client', payment.clientId],
      });
      if (payment.invoiceId) {
        queryClient.invalidateQueries({
          queryKey: ['payments', 'invoice', payment.invoiceId],
        });
        queryClient.invalidateQueries({
          queryKey: ['invoices', payment.invoiceId],
        });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
      toast.success('Платеж успешно создан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания платежа');
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentDto }) =>
      paymentsApi.update(id, data),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', payment.id] });
      queryClient.invalidateQueries({
        queryKey: ['payments', 'client', payment.clientId],
      });
      if (payment.invoiceId) {
        queryClient.invalidateQueries({
          queryKey: ['payments', 'invoice', payment.invoiceId],
        });
        queryClient.invalidateQueries({
          queryKey: ['invoices', payment.invoiceId],
        });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
      toast.success('Платеж обновлен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления платежа');
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Платеж удален');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления платежа');
    },
  });
};
