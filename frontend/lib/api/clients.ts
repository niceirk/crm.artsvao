import { apiClient } from './client';
import type {
  Client,
  CreateClientDto,
  UpdateClientDto,
  ClientFilterParams,
  ClientsListResponse,
  ClientRelation,
  CreateRelationDto,
  ClientRelationsResponse,
} from '../types/clients';

/**
 * Получить список клиентов с фильтрацией и пагинацией
 */
export const getClients = async (
  params?: ClientFilterParams
): Promise<ClientsListResponse> => {
  const response = await apiClient.get<ClientsListResponse>('/clients', {
    params,
  });
  return response.data;
};

/**
 * Получить клиента по ID
 */
export const getClient = async (id: string): Promise<Client> => {
  const response = await apiClient.get<Client>(`/clients/${id}`);
  return response.data;
};

/**
 * Создать нового клиента
 */
export const createClient = async (data: CreateClientDto): Promise<Client> => {
  const response = await apiClient.post<Client>('/clients', data);
  return response.data;
};

/**
 * Обновить клиента
 */
export const updateClient = async (
  id: string,
  data: UpdateClientDto
): Promise<Client> => {
  const response = await apiClient.patch<Client>(`/clients/${id}`, data);
  return response.data;
};

/**
 * Удалить клиента (soft delete)
 */
export const deleteClient = async (id: string): Promise<Client> => {
  const response = await apiClient.delete<Client>(`/clients/${id}`);
  return response.data;
};

/**
 * Поиск клиентов по запросу
 */
export const searchClients = async (query: string): Promise<Client[]> => {
  const response = await apiClient.get<Client[]>('/clients/search', {
    params: { q: query },
  });
  return response.data;
};

/**
 * Получить родственные связи клиента
 */
export const getClientRelations = async (
  clientId: string
): Promise<ClientRelationsResponse> => {
  const response = await apiClient.get<ClientRelationsResponse>(
    `/clients/${clientId}/relations`
  );
  return response.data;
};

/**
 * Создать родственную связь
 */
export const createClientRelation = async (
  clientId: string,
  data: CreateRelationDto
): Promise<ClientRelation> => {
  const response = await apiClient.post<ClientRelation>(
    `/clients/${clientId}/relations`,
    data
  );
  return response.data;
};

/**
 * Удалить родственную связь
 */
export const deleteClientRelation = async (
  clientId: string,
  relationId: string
): Promise<ClientRelation> => {
  const response = await apiClient.delete<ClientRelation>(
    `/clients/${clientId}/relations/${relationId}`
  );
  return response.data;
};
