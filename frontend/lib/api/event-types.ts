import { apiClient } from './client';

export interface EventType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventTypeDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateEventTypeDto extends Partial<CreateEventTypeDto> {}

export const eventTypesApi = {
  getEventTypes: async (): Promise<EventType[]> => {
    const { data } = await apiClient.get('/event-types');
    return data;
  },

  getEventType: async (id: string): Promise<EventType> => {
    const { data } = await apiClient.get(`/event-types/${id}`);
    return data;
  },

  createEventType: async (eventTypeData: CreateEventTypeDto): Promise<EventType> => {
    const { data } = await apiClient.post('/event-types', eventTypeData);
    return data;
  },

  updateEventType: async (id: string, eventTypeData: UpdateEventTypeDto): Promise<EventType> => {
    const { data } = await apiClient.patch(`/event-types/${id}`, eventTypeData);
    return data;
  },

  deleteEventType: async (id: string): Promise<void> => {
    await apiClient.delete(`/event-types/${id}`);
  },
};
