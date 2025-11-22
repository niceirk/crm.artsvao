import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi, Group, CreateGroupDto, UpdateGroupDto, GroupFilters } from '@/lib/api/groups';
import { toast } from '@/lib/utils/toast';

export const useGroups = (filters?: GroupFilters) => {
  return useQuery({
    queryKey: ['groups', filters],
    queryFn: () => groupsApi.getGroups(filters),
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

  return useMutation({
    mutationFn: (data: CreateGroupDto) => groupsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Группа создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания группы');
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGroupDto }) =>
      groupsApi.updateGroup(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.id] });
      toast.success('Группа обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления группы');
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => groupsApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Группа удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления группы');
    },
  });
};
