import { apiClient } from './client';
import { CalendarEventStatus } from './calendar-event-status';

// Re-export for convenience
export { CalendarEventStatus };

export interface Event {
  id: string;
  name: string;
  description?: string;
  fullDescription?: string;
  eventTypeId?: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  responsibleUserId?: string;
  status: CalendarEventStatus;
  notes?: string;
  participants?: number;
  budget?: number;
  maxCapacity?: number;
  photoUrl?: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
  // Optional fields for UI (may not exist in all cases)
  timepadLink?: string;
  isPaid?: boolean;
  isGovernmentTask?: boolean;
  eventFormat?: string;
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
  status?: CalendarEventStatus;
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

  syncEvents: async (eventIds: string[]): Promise<SyncEventsResult> => {
    const { data } = await apiClient.post('/events/sync', { eventIds });
    return data;
  },

  uploadPhoto: async (id: string, file: File): Promise<Event> => {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await apiClient.post(`/events/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deletePhoto: async (id: string): Promise<Event> => {
    const { data } = await apiClient.delete(`/events/${id}/photo`);
    return data;
  },
};

export interface SyncEventsResult {
  success: number;
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
  details: Array<{ eventId: string; externalId?: string; synced: boolean }>;
}
