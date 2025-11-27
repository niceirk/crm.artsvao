import { useQuery } from '@tanstack/react-query';
import { getClientArchivedSales, getClientArchivedSalesSummary, getArchivedSale, type GetArchivedSalesParams } from '@/lib/api/archived-sales';

export const useClientArchivedSales = (clientId: string, params: GetArchivedSalesParams = {}) => {
  return useQuery({
    queryKey: ['clients', clientId, 'archived-sales', params],
    queryFn: () => getClientArchivedSales(clientId, params),
    enabled: !!clientId,
  });
};

export const useClientArchivedSalesSummary = (clientId: string) => {
  return useQuery({
    queryKey: ['clients', clientId, 'archived-sales', 'summary'],
    queryFn: () => getClientArchivedSalesSummary(clientId),
    enabled: !!clientId,
  });
};

export const useArchivedSale = (id: string | null) => {
  return useQuery({
    queryKey: ['archived-sales', id],
    queryFn: () => getArchivedSale(id!),
    enabled: !!id,
  });
};
