'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SERVER_URL } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Trash2, Loader2, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Схемы валидации
const profileSchema = z.object({
  firstName: z.string().min(2, 'Минимум 2 символа').max(50, 'Максимум 50 символов'),
  lastName: z.string().min(2, 'Минимум 2 символа').max(50, 'Максимум 50 символов'),
  email: z.string().email('Введите корректный email'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Минимум 6 символов'),
  newPassword: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string().min(6, 'Минимум 6 символов'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const {
    profile,
    isLoading,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAvatar,
    isUpdatingProfile,
    isChangingPassword,
    isUploadingAvatar,
    isDeletingAvatar,
  } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Форма профиля
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
    } : undefined,
  });

  // Форма пароля
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Обработчики
  const handleProfileSubmit = (data: ProfileFormData) => {
    updateProfile(data);
  };

  const handlePasswordSubmit = (data: PasswordFormData) => {
    changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    passwordForm.reset();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const handleDeleteAvatar = () => {
    if (confirm('Вы уверены, что хотите удалить аватар?')) {
      deleteAvatar();
    }
  };

  // Получаем инициалы для аватара
  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  };

  // Получаем роль на русском
  const getRoleLabel = (role: string) => {
    return role === 'ADMIN' ? 'Администратор' : 'Менеджер';
  };

  // Получаем статус на русском
  const getStatusLabel = (status: string) => {
    return status === 'ACTIVE' ? 'Активен' : 'Заблокирован';
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl py-8">
        <p className="text-center text-muted-foreground">Не удалось загрузить профиль</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мой профиль</h1>
        <p className="text-muted-foreground">
          Управляйте своим профилем и настройками безопасности
        </p>
      </div>

      {/* Секция с аватаром и основной информацией */}
      <Card>
        <CardHeader>
          <CardTitle>Информация о пользователе</CardTitle>
          <CardDescription>
            Основная информация вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Аватар */}
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={profile.avatarUrl ? `${SERVER_URL}${profile.avatarUrl}` : undefined}
                alt={`${profile.firstName} ${profile.lastName}`}
              />
              <AvatarFallback className="text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Фото профиля</p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG или GIF. Максимум 5MB
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  size="sm"
                  variant="outline"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Загрузить
                </Button>
                {profile.avatarUrl && (
                  <Button
                    onClick={handleDeleteAvatar}
                    disabled={isDeletingAvatar}
                    size="sm"
                    variant="outline"
                  >
                    {isDeletingAvatar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Удалить
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Информация */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Роль</Label>
              <div>
                <Badge variant="secondary">{getRoleLabel(profile.role)}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Статус</Label>
              <div>
                <Badge
                  variant={profile.status === 'ACTIVE' ? 'default' : 'destructive'}
                >
                  {getStatusLabel(profile.status)}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Последний вход</Label>
              <p className="text-sm font-medium">
                {profile.lastLoginAt
                  ? format(new Date(profile.lastLoginAt), 'dd MMMM yyyy, HH:mm', { locale: ru })
                  : 'Не известно'}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Дата регистрации</Label>
              <p className="text-sm font-medium">
                {format(new Date(profile.createdAt), 'dd MMMM yyyy', { locale: ru })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Форма редактирования профиля */}
      <Card>
        <CardHeader>
          <CardTitle>Редактировать профиль</CardTitle>
          <CardDescription>
            Обновите свои личные данные
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  {...profileForm.register('firstName')}
                  placeholder="Введите имя"
                />
                {profileForm.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  {...profileForm.register('lastName')}
                  placeholder="Введите фамилию"
                />
                {profileForm.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...profileForm.register('email')}
                placeholder="Введите email"
              />
              {profileForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить изменения
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Форма смены пароля */}
      <Card>
        <CardHeader>
          <CardTitle>Изменить пароль</CardTitle>
          <CardDescription>
            Убедитесь, что ваш пароль надежный и уникальный
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  {...passwordForm.register('currentPassword')}
                  placeholder="Введите текущий пароль"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  {...passwordForm.register('newPassword')}
                  placeholder="Введите новый пароль"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...passwordForm.register('confirmPassword')}
                  placeholder="Подтвердите новый пароль"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Изменить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
