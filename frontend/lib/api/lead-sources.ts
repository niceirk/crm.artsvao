import { apiClient } from './client';
import type { LeadSource, CreateLeadSourceDto, UpdateLeadSourceDto } from '../types/lead-sources';

export const getLeadSources = async (): Promise<LeadSource[]> => {
  const response = await apiClient.get('/lead-sources');
  return response.data;
};

export const getActiveLeadSources = async (): Promise<LeadSource[]> => {
  const response = await apiClient.get('/lead-sources/active');
  return response.data;
};

export const getLeadSource = async (id: string): Promise<LeadSource> => {
  const response = await apiClient.get(`/lead-sources/${id}`);
  return response.data;
};

export const createLeadSource = async (data: CreateLeadSourceDto): Promise<LeadSource> => {
  const response = await apiClient.post('/lead-sources', data);
  return response.data;
};

export const updateLeadSource = async (id: string, data: UpdateLeadSourceDto): Promise<LeadSource> => {
  const response = await apiClient.patch(`/lead-sources/${id}`, data);
  return response.data;
};

export const deleteLeadSource = async (id: string): Promise<void> => {
  await apiClient.delete(`/lead-sources/${id}`);
};
