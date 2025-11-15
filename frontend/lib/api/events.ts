import { apiClient } from './client';

export interface Event {
  id: string;
  name: string;
  description?: string;
  eventTypeId?: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  responsibleUserId?: string;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  participants?: number;
  budget?: number;
  maxCapacity?: number;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  eventType?: {
    id: string;
    name: string;
    color?: string;
  };
  responsibleUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  room?: {
    id: string;
    name: string;
    number?: string;
  };
}

export interface CreateEventDto {
  name: string;
  eventTypeId?: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  responsibleUserId?: string;
  status?: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  participants?: number;
  budget?: number;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {}

export interface EventFilters {
  date?: string;
  status?: string;
  eventTypeId?: string | string[];
  roomId?: string | string[];
}

export const eventsApi = {
  getEvents: async (filters?: EventFilters): Promise<Event[]> => {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.status) params.append('status', filters.status);

    if (filters?.eventTypeId) {
      if (Array.isArray(filters.eventTypeId)) {
        filters.eventTypeId.forEach(id => params.append('eventTypeId', id));
      } else {
        params.append('eventTypeId', filters.eventTypeId);
      }
    }

    if (filters?.roomId) {
      if (Array.isArray(filters.roomId)) {
        filters.roomId.forEach(id => params.append('roomId', id));
      } else {
        params.append('roomId', filters.roomId);
      }
    }

    const { data } = await apiClient.get(`/events?${params.toString()}`);
    return data;
  },

  getEvent: async (id: string): Promise<Event> => {
    const { data } = await apiClient.get(`/events/${id}`);
    return data;
  },

  createEvent: async (eventData: CreateEventDto): Promise<Event> => {
    const { data } = await apiClient.post('/events', eventData);
    return data;
  },

  updateEvent: async (id: string, eventData: UpdateEventDto): Promise<Event> => {
    const { data } = await apiClient.patch(`/events/${id}`, eventData);
    return data;
  },

  deleteEvent: async (id: string): Promise<void> => {
    await apiClient.delete(`/events/${id}`);
  },
};
