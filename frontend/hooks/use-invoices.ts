import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invoicesApi } from '@/lib/api/invoices';
import type {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilterDto,
} from '@/lib/types/invoices';

export const INVOICES_QUERY_KEY = 'invoices';

export function useInvoices(filter?: InvoiceFilterDto) {
  return useQuery({
    queryKey: [INVOICES_QUERY_KEY, filter],
    queryFn: () => invoicesApi.getAll(filter),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [INVOICES_QUERY_KEY, id],
    queryFn: () => invoicesApi.getById(id!),
    enabled: !!id,
  });
}

export function useClientInvoices(clientId: string | undefined) {
  return useQuery({
    queryKey: [INVOICES_QUERY_KEY, 'client', clientId],
    queryFn: () => invoicesApi.getByClient(clientId!),
    enabled: !!clientId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
      toast.success('Счет успешно создан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при создании счета');
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceDto }) =>
      invoicesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY, variables.id] });
      toast.success('Счет успешно обновлен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении счета');
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoicesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
      toast.success('Счет успешно удален');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при удалении счета');
    },
  });
}

export function useMarkAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoicesApi.markAsPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
      toast.success('Счет отмечен как оплаченный');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении статуса');
    },
  });
}
