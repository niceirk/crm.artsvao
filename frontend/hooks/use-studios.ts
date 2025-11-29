import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studiosApi, Studio, CreateStudioDto, UpdateStudioDto } from '@/lib/api/studios';
import { toast } from '@/lib/utils/toast';

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

  return useMutation({
    mutationFn: (data: CreateStudioDto) => studiosApi.createStudio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      toast.success('Студия создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания студии');
    },
  });
};

export const useUpdateStudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudioDto }) =>
      studiosApi.updateStudio(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      queryClient.invalidateQueries({ queryKey: ['studios', variables.id] });
      toast.success('Студия обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления студии');
    },
  });
};

export const useDeleteStudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studiosApi.deleteStudio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      toast.success('Студия удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления студии');
    },
  });
};

export const useUploadStudioPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      studiosApi.uploadPhoto(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      queryClient.invalidateQueries({ queryKey: ['studios', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка загрузки фото');
    },
  });
};

export const useDeleteStudioPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studiosApi.deletePhoto(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      queryClient.invalidateQueries({ queryKey: ['studios', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления фото');
    },
  });
};
