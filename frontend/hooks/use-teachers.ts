import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teachersApi, Teacher, CreateTeacherDto, UpdateTeacherDto } from '@/lib/api/teachers';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTeacherDto) => teachersApi.createTeacher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast({
        title: 'Успешно',
        description: 'Преподаватель создан',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка создания преподавателя',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeacherDto }) =>
      teachersApi.updateTeacher(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers', variables.id] });
      toast({
        title: 'Успешно',
        description: 'Преподаватель обновлен',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка обновления преподавателя',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => teachersApi.deleteTeacher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast({
        title: 'Успешно',
        description: 'Преподаватель удален',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка удаления преподавателя',
        variant: 'destructive',
      });
    },
  });
};
