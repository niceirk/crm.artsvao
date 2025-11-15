import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studiosApi, Studio, CreateStudioDto, UpdateStudioDto } from '@/lib/api/studios';
import { useToast } from '@/hooks/use-toast';

export const useStudios = () => {
  return useQuery({
    queryKey: ['studios'],
    queryFn: studiosApi.getStudios,
  });
};

export const useStudio = (id: string) => {
  return useQuery({
    queryKey: ['studios', id],
    queryFn: () => studiosApi.getStudio(id),
    enabled: !!id,
  });
};

export const useCreateStudio = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateStudioDto) => studiosApi.createStudio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      toast({
        title: 'Успешно',
        description: 'Студия создана',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка создания студии',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateStudio = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudioDto }) =>
      studiosApi.updateStudio(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      queryClient.invalidateQueries({ queryKey: ['studios', variables.id] });
      toast({
        title: 'Успешно',
        description: 'Студия обновлена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка обновления студии',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteStudio = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => studiosApi.deleteStudio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      toast({
        title: 'Успешно',
        description: 'Студия удалена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка удаления студии',
        variant: 'destructive',
      });
    },
  });
};
