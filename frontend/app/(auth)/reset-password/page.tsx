'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Logo } from '@/components/logo';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      setError('Токен восстановления не найден');
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Токен восстановления не найден');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Произошла ошибка. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-4 pb-8">
            <div className="flex justify-center">
              <Logo size="lg" showText={false} />
            </div>
            <div className="space-y-2 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Пароль успешно изменен
              </CardTitle>
              <CardDescription className="text-base">
                Через несколько секунд вы будете перенаправлены на страницу входа
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">
                Перейти на страницу входа
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-4 pb-8">
            <div className="flex justify-center">
              <Logo size="lg" showText={false} />
            </div>
            <div className="space-y-2 text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Недействительная ссылка
              </CardTitle>
              <CardDescription className="text-base">
                {error}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/forgot-password">
              <Button className="w-full">
                Запросить новую ссылку
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Вернуться на страницу входа
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 pb-8">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-center">
              Новый пароль
            </CardTitle>
            <CardDescription className="text-center text-base">
              Введите новый пароль для вашей учетной записи
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                Новый пароль
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••"
                {...register('newPassword')}
                disabled={isSubmitting}
              />
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Подтвердите пароль
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••"
                {...register('confirmPassword')}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить новый пароль'
              )}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                Вернуться на страницу входа
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
