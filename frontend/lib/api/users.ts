import { apiClient } from './client';
import { User } from '../types/auth';

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

/**
 * Получить профиль текущего пользователя
 */
export const getMyProfile = async (): Promise<User> => {
  const response = await apiClient.get<User>('/users/me');
  return response.data;
};

/**
 * Обновить профиль текущего пользователя
 */
export const updateMyProfile = async (
  data: UpdateProfileDto,
): Promise<User> => {
  const response = await apiClient.patch<User>('/users/me', data);
  return response.data;
};

/**
 * Сменить пароль
 */
export const changePassword = async (
  data: ChangePasswordDto,
): Promise<ChangePasswordResponse> => {
  const response = await apiClient.patch<ChangePasswordResponse>(
    '/users/me/password',
    data,
  );
  return response.data;
};

/**
 * Загрузить аватар
 */
export const uploadAvatar = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiClient.post<User>('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Удалить аватар
 */
export const deleteAvatar = async (): Promise<User> => {
  const response = await apiClient.delete<User>('/users/me/avatar');
  return response.data;
};

// ==================== ADMIN API ====================

export interface UsersFilterParams {
  role?: 'ADMIN' | 'MANAGER';
  status?: 'ACTIVE' | 'BLOCKED';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateInviteDto {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER';
}

export interface UpdateUserStatusDto {
  status: 'ACTIVE' | 'BLOCKED';
}

export interface UsersListResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InviteResponse {
  user: User;
  inviteLink: string;
  inviteToken: string;
  message: string;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER';
  password?: string;
  sendInvite?: boolean;
}

export interface CreateUserResponse {
  user: User;
  inviteLink?: string;
  message: string;
}

/**
 * Получить список всех пользователей (только для админов)
 */
export const getUsers = async (
  filters?: UsersFilterParams,
): Promise<UsersListResponse> => {
  const response = await apiClient.get<UsersListResponse>('/users', {
    params: filters,
  });
  return response.data;
};

/**
 * Создать приглашение для нового пользователя (только для админов)
 */
export const createInvite = async (
  data: CreateInviteDto,
): Promise<InviteResponse> => {
  const response = await apiClient.post<InviteResponse>('/users/invite', data);
  return response.data;
};

/**
 * Создать пользователя напрямую (только для админов)
 */
export const createUser = async (
  data: CreateUserDto,
): Promise<CreateUserResponse> => {
  const response = await apiClient.post<CreateUserResponse>('/users', data);
  return response.data;
};

/**
 * Обновить статус пользователя (только для админов)
 */
export const updateUserStatus = async (
  userId: string,
  data: UpdateUserStatusDto,
): Promise<User> => {
  const response = await apiClient.patch<User>(
    `/users/${userId}/status`,
    data,
  );
  return response.data;
};

/**
 * Удалить пользователя (только для админов)
 */
export const deleteUser = async (
  userId: string,
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/users/${userId}`,
  );
  return response.data;
};
