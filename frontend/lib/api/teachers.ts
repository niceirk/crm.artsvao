import { apiClient } from './client';

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  email?: string;
  specialization?: string;
  salaryPercentage?: number;
  photoUrl?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RETIRED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    groups: number;
    schedules: number;
  };
}

export interface CreateTeacherDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  email?: string;
  specialization?: string;
  salaryPercentage: number;
  photoUrl?: string;
  status?: 'ACTIVE' | 'ON_LEAVE' | 'RETIRED';
}

export interface UpdateTeacherDto extends Partial<CreateTeacherDto> {}

export const teachersApi = {
  getTeachers: async (): Promise<Teacher[]> => {
    const { data } = await apiClient.get('/teachers');
    return data;
  },

  getTeacher: async (id: string): Promise<Teacher> => {
    const { data } = await apiClient.get(`/teachers/${id}`);
    return data;
  },

  createTeacher: async (teacherData: CreateTeacherDto): Promise<Teacher> => {
    const { data } = await apiClient.post('/teachers', teacherData);
    return data;
  },

  updateTeacher: async (id: string, teacherData: UpdateTeacherDto): Promise<Teacher> => {
    const { data } = await apiClient.patch(`/teachers/${id}`, teacherData);
    return data;
  },

  deleteTeacher: async (id: string): Promise<void> => {
    await apiClient.delete(`/teachers/${id}`);
  },
};
