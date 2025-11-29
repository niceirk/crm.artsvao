'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SERVER_URL } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
  KeyRound,
  Mail,
  Calendar,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
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
  const handleProfileSubmit = async (data: ProfileFormData) => {
    await updateProfile(data);
    setIsEditing(false);
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    passwordForm.reset();
    setIsChangingPass(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    profileForm.reset();
  };

  const handleCancelPassword = () => {
    setIsChangingPass(false);
    passwordForm.reset();
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
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
    if (confirm('Удалить фото профиля?')) {
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

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1">
        <p className="text-center text-muted-foreground py-12">
          Не удалось загрузить профиль
        </p>
      </div>
    );
  }

  const fullName = `${profile.lastName} ${profile.firstName}`;

  return (
    <div className="flex-1 space-y-6">
      {/* Шапка профиля */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={profile.avatarUrl
                  ? (profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${SERVER_URL}${profile.avatarUrl}`)
                  : undefined}
                alt={fullName}
              />
              <AvatarFallback className="text-2xl bg-primary/10">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                {profile.avatarUrl && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleDeleteAvatar}
                    disabled={isDeletingAvatar}
                  >
                    {isDeletingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <Badge variant="secondary">{getRoleLabel(profile.role)}</Badge>
              <Badge variant={profile.status === 'ACTIVE' ? 'default' : 'destructive'}>
                {profile.status === 'ACTIVE' ? 'Активен' : 'Заблокирован'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
          </div>
        </div>

        {!isEditing && !isChangingPass && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button variant="outline" onClick={() => setIsChangingPass(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Сменить пароль
            </Button>
          </div>
        )}
      </div>

      {/* Основная информация и редактирование */}
      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-6">
            {!isEditing && !isChangingPass ? (
              /* Режим просмотра */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Имя</Label>
                    <p className="font-medium">{profile.firstName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Фамилия</Label>
                    <p className="font-medium">{profile.lastName}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Последний вход</Label>
                      <p className="font-medium">
                        {profile.lastLoginAt
                          ? format(new Date(profile.lastLoginAt), 'dd MMM yyyy, HH:mm', { locale: ru })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Дата регистрации</Label>
                    <p className="font-medium">
                      {format(new Date(profile.createdAt), 'dd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                </div>
              </div>
            ) : isEditing ? (
              /* Режим редактирования профиля */
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      {...profileForm.register('firstName')}
                      placeholder="Введите имя"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-xs text-destructive">
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
                      <p className="text-xs text-destructive">
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
                    <p className="text-xs text-destructive">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Сохранить
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Отмена
                  </Button>
                </div>
              </form>
            ) : (
              /* Режим смены пароля */
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Новый пароль</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        {...passwordForm.register('newPassword')}
                        placeholder="Новый пароль"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...passwordForm.register('confirmPassword')}
                        placeholder="Повторите пароль"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Сменить пароль
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelPassword}>
                    <X className="h-4 w-4 mr-2" />
                    Отмена
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
