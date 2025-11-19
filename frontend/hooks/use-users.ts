'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getUsers,
  createInvite,
  updateUserStatus,
  deleteUser,
  type UsersFilterParams,
  type CreateInviteDto,
  type UpdateUserStatusDto,
} from '@/lib/api/users';

/**
 * Хук для получения списка пользователей
 */
export function useUsers(filters?: UsersFilterParams) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
  });
}

/**
 * Хук для создания приглашения
 */
export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInviteDto) => createInvite(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Не удалось создать приглашение',
      );
    },
  });
}

/**
 * Хук для обновления статуса пользователя
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: UpdateUserStatusDto;
    }) => updateUserStatus(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Статус пользователя обновлен');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Не удалось обновить статус',
      );
    },
  });
}

/**
 * Хук для удаления пользователя
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Не удалось удалить пользователя',
      );
    },
  });
}
