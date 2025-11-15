import { apiClient } from './client';
import { CalendarEventStatus } from './calendar-event-status';

export interface Rental {
  id: string;
  roomId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: CalendarEventStatus;
  managerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  room?: {
    id: string;
    name: string;
    number?: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface RentalFilters {
  date?: string;
  roomId?: string | string[];
  status?: string;
}

export interface CreateRentalDto {
  roomId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  eventType?: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice?: number;
  status?: CalendarEventStatus;
  managerId?: string;
  notes?: string;
}

export interface UpdateRentalDto extends Partial<CreateRentalDto> {}

export const rentalsApi = {
  getRentals: async (filters?: RentalFilters): Promise<Rental[]> => {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);

    if (filters?.roomId) {
      if (Array.isArray(filters.roomId)) {
        filters.roomId.forEach(id => params.append('roomId', id));
      } else {
        params.append('roomId', filters.roomId);
      }
    }

    if (filters?.status) params.append('status', filters.status);

    const { data } = await apiClient.get(`/rentals?${params.toString()}`);
    return data;
  },

  getRental: async (id: string): Promise<Rental> => {
    const { data } = await apiClient.get(`/rentals/${id}`);
    return data;
  },

  createRental: async (rentalData: CreateRentalDto): Promise<Rental> => {
    const { data } = await apiClient.post('/rentals', rentalData);
    return data;
  },

  updateRental: async (id: string, rentalData: UpdateRentalDto): Promise<Rental> => {
    const { data } = await apiClient.patch(`/rentals/${id}`, rentalData);
    return data;
  },

  deleteRental: async (id: string): Promise<void> => {
    await apiClient.delete(`/rentals/${id}`);
  },
};
