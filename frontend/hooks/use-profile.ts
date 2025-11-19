import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
  UpdateProfileDto,
  ChangePasswordDto,
} from '../lib/api/users';
import { User } from '../lib/types/auth';
import { toast } from 'sonner';
import { useAuthStore } from '../lib/store/auth-store';

/**
 * Хук для управления профилем пользователя
 */
export function useProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  // Получение профиля
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: getMyProfile,
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  // Обновление профиля
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileDto) => updateMyProfile(data),
    onSuccess: (updatedUser: User) => {
      // Обновляем кэш
      queryClient.setQueryData(['profile'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Обновляем навигацию
      // Обновляем глобальное состояние
      setUser(updatedUser);
      toast.success('Профиль успешно обновлен');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось обновить профиль';
      toast.error(message);
    },
  });

  // Смена пароля
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordDto) => changePassword(data),
    onSuccess: (response) => {
      toast.success(response.message);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось изменить пароль';
      toast.error(message);
    },
  });

  // Загрузка аватара
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(['profile'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Обновляем навигацию
      setUser(updatedUser);
      toast.success('Аватар успешно загружен');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось загрузить аватар';
      toast.error(message);
    },
  });

  // Удаление аватара
  const deleteAvatarMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(['profile'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Обновляем навигацию
      setUser(updatedUser);
      toast.success('Аватар успешно удален');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось удалить аватар';
      toast.error(message);
    },
  });

  return {
    // Данные
    profile,
    isLoading,
    error,

    // Методы
    refetch,
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    uploadAvatar: uploadAvatarMutation.mutate,
    deleteAvatar: deleteAvatarMutation.mutate,

    // Состояния мутаций
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    isDeletingAvatar: deleteAvatarMutation.isPending,
  };
}
