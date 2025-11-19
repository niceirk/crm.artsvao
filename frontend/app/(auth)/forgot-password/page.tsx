'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Logo } from '@/components/logo';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/auth/forgot-password', data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Произошла ошибка. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                Проверьте вашу почту
              </CardTitle>
              <CardDescription className="text-base">
                Если аккаунт с указанным email существует, мы отправили на него инструкции по восстановлению пароля
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
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
              Восстановление пароля
            </CardTitle>
            <CardDescription className="text-center text-base">
              Введите email, указанный при регистрации
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
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
                  Отправка...
                </>
              ) : (
                'Отправить инструкции'
              )}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Вернуться на страницу входа
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
