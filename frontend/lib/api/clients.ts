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
  ClientDocument,
  CreateClientDocumentDto,
  UpdateClientDocumentDto,
  DocumentType,
  DocumentTypesConfig,
  TelegramAccount,
  RelationType,
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
 * Проверить наличие дубликата по телефону
 */
export const checkDuplicate = async (
  phone: string,
  excludeId?: string
): Promise<Client | null> => {
  const response = await apiClient.get<Client | null>('/clients/check-duplicate', {
    params: { phone, excludeId },
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

/**
 * Обновить тип родственной связи
 */
export const updateClientRelation = async (
  clientId: string,
  relationId: string,
  data: { relationType: RelationType }
): Promise<ClientRelation> => {
  const response = await apiClient.patch<ClientRelation>(
    `/clients/${clientId}/relations/${relationId}`,
    data
  );
  return response.data;
};

// ============================================
// API для работы с документами клиентов
// ============================================

/**
 * Получить список документов клиента
 */
export const getClientDocuments = async (
  clientId: string
): Promise<ClientDocument[]> => {
  const response = await apiClient.get<ClientDocument[]>(
    `/clients/${clientId}/documents`
  );
  return response.data;
};

/**
 * Получить документ по типу
 */
export const getClientDocument = async (
  clientId: string,
  documentType: DocumentType
): Promise<ClientDocument> => {
  const response = await apiClient.get<ClientDocument>(
    `/clients/${clientId}/documents/${documentType}`
  );
  return response.data;
};

/**
 * Создать документ клиента
 */
export const createClientDocument = async (
  clientId: string,
  data: CreateClientDocumentDto
): Promise<ClientDocument> => {
  const response = await apiClient.post<ClientDocument>(
    `/clients/${clientId}/documents`,
    data
  );
  return response.data;
};

/**
 * Обновить документ клиента
 */
export const updateClientDocument = async (
  clientId: string,
  documentType: DocumentType,
  data: UpdateClientDocumentDto
): Promise<ClientDocument> => {
  const response = await apiClient.patch<ClientDocument>(
    `/clients/${clientId}/documents/${documentType}`,
    data
  );
  return response.data;
};

/**
 * Создать или обновить документ клиента (upsert)
 */
export const upsertClientDocument = async (
  clientId: string,
  data: CreateClientDocumentDto
): Promise<ClientDocument> => {
  const response = await apiClient.put<ClientDocument>(
    `/clients/${clientId}/documents`,
    data
  );
  return response.data;
};

/**
 * Удалить документ клиента
 */
export const deleteClientDocument = async (
  clientId: string,
  documentType: DocumentType
): Promise<ClientDocument> => {
  const response = await apiClient.delete<ClientDocument>(
    `/clients/${clientId}/documents/${documentType}`
  );
  return response.data;
};

/**
 * Получить конфигурацию типов документов
 */
export const getDocumentTypesConfig = async (): Promise<DocumentTypesConfig> => {
  const response = await apiClient.get<DocumentTypesConfig>('/document-types');
  return response.data;
};

// ============================================
// API для работы с Telegram аккаунтами клиентов
// ============================================

/**
 * Отвязать Telegram аккаунт от клиента
 */
export const unlinkTelegramAccount = async (
  clientId: string,
  accountId: string
): Promise<TelegramAccount> => {
  const response = await apiClient.delete<TelegramAccount>(
    `/clients/${clientId}/telegram-accounts/${accountId}`
  );
  return response.data;
};

/**
 * Переключить уведомления для Telegram аккаунта
 */
export const toggleTelegramNotifications = async (
  clientId: string,
  accountId: string,
  enabled: boolean
): Promise<TelegramAccount> => {
  const response = await apiClient.patch<TelegramAccount>(
    `/clients/${clientId}/telegram-accounts/${accountId}/notifications`,
    { enabled }
  );
  return response.data;
};

// ============================================
// API для работы с фото клиентов
// ============================================

/**
 * Загрузить фото клиента
 */
export const uploadClientPhoto = async (
  clientId: string,
  file: File
): Promise<Client> => {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await apiClient.post<Client>(
    `/clients/${clientId}/photo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Удалить фото клиента
 */
export const deleteClientPhoto = async (clientId: string): Promise<Client> => {
  const response = await apiClient.delete<Client>(`/clients/${clientId}/photo`);
  return response.data;
};
