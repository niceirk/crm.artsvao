'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [showCredentials, setShowCredentials] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  const fillAdmin = () => {
    const form = document.querySelector('form') as HTMLFormElement;
    (form.elements.namedItem('email') as HTMLInputElement).value = 'admin@artsvao.ru';
    (form.elements.namedItem('password') as HTMLInputElement).value = 'admin123';
  };

  const fillManager = () => {
    const form = document.querySelector('form') as HTMLFormElement;
    (form.elements.namedItem('email') as HTMLInputElement).value = 'manager@artsvao.ru';
    (form.elements.namedItem('password') as HTMLInputElement).value = 'manager123';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Культурный центр
          </CardTitle>
          <CardDescription className="text-center">
            Войдите в систему управления
          </CardDescription>
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
                placeholder="admin@artsvao.ru"
                {...register('email')}
                disabled={isLoggingIn}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Пароль
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                {...register('password')}
                disabled={isLoggingIn}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {loginError instanceof Error
                    ? loginError.message
                    : 'Неверный email или пароль'}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? 'Вход...' : 'Войти'}
            </Button>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowCredentials(!showCredentials)}
              >
                {showCredentials ? 'Скрыть' : 'Показать'} тестовые учетные данные
              </Button>

              {showCredentials && (
                <div className="p-4 bg-gray-100 rounded-md space-y-2 text-sm">
                  <div>
                    <p className="font-semibold">Администратор:</p>
                    <p>Email: admin@artsvao.ru</p>
                    <p>Пароль: admin123</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={fillAdmin}
                      className="p-0 h-auto"
                    >
                      Заполнить форму
                    </Button>
                  </div>
                  <div>
                    <p className="font-semibold">Менеджер:</p>
                    <p>Email: manager@artsvao.ru</p>
                    <p>Пароль: manager123</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={fillManager}
                      className="p-0 h-auto"
                    >
                      Заполнить форму
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
