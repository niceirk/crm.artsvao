import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi, Group, CreateGroupDto, UpdateGroupDto } from '@/lib/api/groups';
import { useToast } from '@/hooks/use-toast';

export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.getGroups,
  });
};

export const useGroup = (id: string) => {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupsApi.getGroup(id),
    enabled: !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateGroupDto) => groupsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: 'Успешно',
        description: 'Группа создана',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка создания группы',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGroupDto }) =>
      groupsApi.updateGroup(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.id] });
      toast({
        title: 'Успешно',
        description: 'Группа обновлена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка обновления группы',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => groupsApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: 'Успешно',
        description: 'Группа удалена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка удаления группы',
        variant: 'destructive',
      });
    },
  });
};
