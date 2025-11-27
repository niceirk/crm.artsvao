import { apiClient } from './client';
import type { PaginatedArchivedSales, ArchivedSalesSummary, ArchivedSale } from '../types/archived-sales';

export interface GetArchivedSalesParams {
  page?: number;
  limit?: number;
  sortBy?: 'saleDate' | 'saleNumber';
  sortOrder?: 'asc' | 'desc';
  year?: number;
  month?: number;
  search?: string;
}

export const getClientArchivedSales = async (
  clientId: string,
  params: GetArchivedSalesParams = {}
): Promise<PaginatedArchivedSales> => {
  const { page = 1, limit = 20, sortBy, sortOrder, year, month, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (sortBy) searchParams.set('sortBy', sortBy);
  if (sortOrder) searchParams.set('sortOrder', sortOrder);
  if (year) searchParams.set('year', String(year));
  if (month) searchParams.set('month', String(month));
  if (search) searchParams.set('search', search);

  const response = await apiClient.get(
    `/clients/${clientId}/archived-sales?${searchParams.toString()}`
  );
  return response.data;
};

export const getClientArchivedSalesSummary = async (
  clientId: string
): Promise<ArchivedSalesSummary> => {
  const response = await apiClient.get(`/clients/${clientId}/archived-sales/summary`);
  return response.data;
};

export const getArchivedSale = async (id: string): Promise<ArchivedSale> => {
  const response = await apiClient.get(`/archived-sales/${id}`);
  return response.data;
};
