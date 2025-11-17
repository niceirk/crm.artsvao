import { apiClient } from './client';
import type {
  Subscription,
  SubscriptionType,
  CreateSubscriptionTypeDto,
  UpdateSubscriptionTypeDto,
  SubscriptionTypeFilterDto,
  SellSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionFilterDto,
  ValidateSubscriptionResponse,
  PaginatedResponse,
} from '../types/subscriptions';

// SubscriptionTypes API
export const subscriptionTypesApi = {
  getAll: async (
    filter?: SubscriptionTypeFilterDto,
  ): Promise<PaginatedResponse<SubscriptionType>> => {
    const params = new URLSearchParams();
    if (filter?.groupId) params.append('groupId', filter.groupId);
    if (filter?.isActive !== undefined)
      params.append('isActive', String(filter.isActive));
    if (filter?.type) params.append('type', filter.type);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.limit) params.append('limit', String(filter.limit));

    const query = params.toString();
    const url = query ? `/subscription-types?${query}` : '/subscription-types';

    const response = await apiClient.get<PaginatedResponse<SubscriptionType>>(
      url,
    );
    return response.data;
  },

  getByGroup: async (groupId: string): Promise<SubscriptionType[]> => {
    const response = await apiClient.get<SubscriptionType[]>(
      `/subscription-types/by-group/${groupId}`,
    );
    return response.data;
  },

  getById: async (id: string): Promise<SubscriptionType> => {
    const response = await apiClient.get<SubscriptionType>(
      `/subscription-types/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CreateSubscriptionTypeDto,
  ): Promise<SubscriptionType> => {
    const response = await apiClient.post<SubscriptionType>(
      '/subscription-types',
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateSubscriptionTypeDto,
  ): Promise<SubscriptionType> => {
    const response = await apiClient.patch<SubscriptionType>(
      `/subscription-types/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/subscription-types/${id}`);
  },
};

// Subscriptions API
export const subscriptionsApi = {
  sell: async (data: SellSubscriptionDto): Promise<Subscription> => {
    const response = await apiClient.post<Subscription>(
      '/subscriptions/sell',
      data,
    );
    return response.data;
  },

  getAll: async (
    filter?: SubscriptionFilterDto,
  ): Promise<PaginatedResponse<Subscription>> => {
    const params = new URLSearchParams();
    if (filter?.clientId) params.append('clientId', filter.clientId);
    if (filter?.groupId) params.append('groupId', filter.groupId);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.validMonth) params.append('validMonth', filter.validMonth);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.limit) params.append('limit', String(filter.limit));

    const query = params.toString();
    const url = query ? `/subscriptions?${query}` : '/subscriptions';

    const response = await apiClient.get<PaginatedResponse<Subscription>>(url);
    return response.data;
  },

  getById: async (id: string): Promise<Subscription> => {
    const response = await apiClient.get<Subscription>(`/subscriptions/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateSubscriptionDto,
  ): Promise<Subscription> => {
    const response = await apiClient.patch<Subscription>(
      `/subscriptions/${id}`,
      data,
    );
    return response.data;
  },

  validate: async (
    id: string,
    date?: string,
  ): Promise<ValidateSubscriptionResponse> => {
    const response = await apiClient.post<ValidateSubscriptionResponse>(
      `/subscriptions/${id}/validate`,
      { date },
    );
    return response.data;
  },
};
