import { apiClient } from './client';

export interface Reservation {
  id: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  notes?: string;
  reservedBy: string;
  createdAt: string;
  updatedAt: string;
  room?: {
    id: string;
    name: string;
    number?: string;
  };
}

export interface CreateReservationDto {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: 'PENDING' | 'APPROVED' | 'CANCELLED';
  notes?: string;
  reservedBy: string;
}

export interface UpdateReservationDto extends Partial<CreateReservationDto> {}

export interface ReservationFilters {
  date?: string;
  roomId?: string | string[];
  status?: string;
}

export const reservationsApi = {
  getReservations: async (filters?: ReservationFilters): Promise<Reservation[]> => {
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

    const { data } = await apiClient.get(`/reservations?${params.toString()}`);
    return data;
  },

  getReservation: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.get(`/reservations/${id}`);
    return data;
  },

  createReservation: async (reservationData: CreateReservationDto): Promise<Reservation> => {
    const { data } = await apiClient.post('/reservations', reservationData);
    return data;
  },

  updateReservation: async (id: string, reservationData: UpdateReservationDto): Promise<Reservation> => {
    const { data } = await apiClient.patch(`/reservations/${id}`, reservationData);
    return data;
  },

  deleteReservation: async (id: string): Promise<void> => {
    await apiClient.delete(`/reservations/${id}`);
  },
};
