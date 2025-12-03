import { apiClient } from './client';

export interface Room {
  id: string;
  name: string;
  number?: string;
  area?: number;
  capacity?: number;
  type: 'HALL' | 'CLASS' | 'STUDIO' | 'CONFERENCE';
  equipment?: string;
  hourlyRate: number;
  dailyRate?: number;
  dailyRateCoworking?: number;
  weeklyRateCoworking?: number;
  monthlyRateCoworking?: number;
  isCoworking?: boolean;
  sortOrder?: number;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    schedules: number;
    rentals: number;
    workspaces: number;
  };
}

export interface CreateRoomDto {
  name: string;
  number?: string;
  capacity: number;
  type: 'HALL' | 'CLASS' | 'STUDIO' | 'CONFERENCE';
  hourlyRate: number;
  dailyRate?: number;
  description?: string;
  equipment?: string;
  isCoworking?: boolean;
  dailyRateCoworking?: number;
  monthlyRateCoworking?: number;
  sortOrder?: number;
}

export interface UpdateRoomDto extends Partial<CreateRoomDto> {}

export const roomsApi = {
  getRooms: async (): Promise<Room[]> => {
    const { data } = await apiClient.get('/rooms');
    return data;
  },

  getRoom: async (id: string): Promise<Room> => {
    const { data } = await apiClient.get(`/rooms/${id}`);
    return data;
  },

  createRoom: async (roomData: CreateRoomDto): Promise<Room> => {
    const { data } = await apiClient.post('/rooms', roomData);
    return data;
  },

  updateRoom: async (id: string, roomData: UpdateRoomDto): Promise<Room> => {
    const { data } = await apiClient.patch(`/rooms/${id}`, roomData);
    return data;
  },

  deleteRoom: async (id: string): Promise<void> => {
    await apiClient.delete(`/rooms/${id}`);
  },
};
