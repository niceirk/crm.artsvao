import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teachersApi, Teacher, CreateTeacherDto, UpdateTeacherDto } from '@/lib/api/teachers';
import { toast } from '@/lib/utils/toast';

export const useTeachers = () => {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: teachersApi.getTeachers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTeacher = (id: string) => {
  return useQuery({
    queryKey: ['teachers', id],
    queryFn: () => teachersApi.getTeacher(id),
    enabled: !!id,
  });
};

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeacherDto) => teachersApi.createTeacher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Преподаватель создан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания преподавателя');
    },
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeacherDto }) =>
      teachersApi.updateTeacher(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers', variables.id] });
      toast.success('Преподаватель обновлен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления преподавателя');
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => teachersApi.deleteTeacher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Преподаватель удален');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления преподавателя');
    },
  });
};

export const useUploadTeacherPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      teachersApi.uploadPhoto(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка загрузки фото');
    },
  });
};

export const useDeleteTeacherPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => teachersApi.deletePhoto(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления фото');
    },
  });
};
