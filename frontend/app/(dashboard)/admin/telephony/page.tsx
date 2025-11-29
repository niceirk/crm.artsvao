'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Phone, Settings, TestTube2, History, RefreshCw, Users, Hash } from 'lucide-react';
import {
  useTelephonySettings,
  useUpdateTelephonySettings,
  useTestConnection,
  useCallHistory,
  useNovofonEmployees,
  useNovofonVirtualNumbers,
} from '@/hooks/use-novofon';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPhoneNumber } from '@/lib/utils/phone';

interface SettingsFormData {
  accessToken: string;
  virtualPhoneNumber: string;
  defaultEmployeeId: number | null;
  isEnabled: boolean;
}

const callStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  INITIATED: { label: 'Инициирован', variant: 'secondary' },
  SUCCESS: { label: 'Успешно', variant: 'default' },
  FAILED: { label: 'Ошибка', variant: 'destructive' },
  NO_ANSWER: { label: 'Нет ответа', variant: 'outline' },
  BUSY: { label: 'Занято', variant: 'outline' },
};

export default function TelephonySettingsPage() {
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useTelephonySettings();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useCallHistory({ limit: 20 });
  const updateSettings = useUpdateTelephonySettings();
  const testConnection = useTestConnection();
  const [showSecrets, setShowSecrets] = useState(false);

  // Загружаем сотрудников и номера только если есть токен
  const hasToken = settings?.accessToken && settings.accessToken.length > 0;
  const { data: employees, isLoading: employeesLoading, refetch: refetchEmployees } = useNovofonEmployees(hasToken);
  const { data: virtualNumbers, isLoading: numbersLoading, refetch: refetchNumbers } = useNovofonVirtualNumbers(hasToken);

  const { register, handleSubmit, setValue, watch } = useForm<SettingsFormData>({
    defaultValues: {
      accessToken: '',
      virtualPhoneNumber: '',
      defaultEmployeeId: null,
      isEnabled: false,
    },
  });

  useEffect(() => {
    if (settings) {
      setValue('accessToken', settings.accessToken || '');
      setValue('virtualPhoneNumber', settings.virtualPhoneNumber || '');
      setValue('defaultEmployeeId', settings.defaultEmployeeId);
      setValue('isEnabled', settings.isEnabled);
    }
  }, [settings, setValue]);

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate(data);
  };

  const handleTestConnection = () => {
    testConnection.mutate();
  };

  const handleLoadData = () => {
    refetchEmployees();
    refetchNumbers();
  };

  const isEnabled = watch('isEnabled');
  const selectedEmployeeId = watch('defaultEmployeeId');
  const selectedVirtualNumber = watch('virtualPhoneNumber');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6" />
            Настройки телефонии
          </h1>
          <p className="text-muted-foreground">
            Интеграция с IP-телефонией Novofon API 2.0 для click-to-call
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Настройки */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Настройки API
            </CardTitle>
            <CardDescription>
              Данные для подключения к Novofon API 2.0
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isEnabled">Телефония включена</Label>
                  <p className="text-sm text-muted-foreground">
                    Разрешить совершение звонков
                  </p>
                </div>
                <Switch
                  id="isEnabled"
                  checked={isEnabled}
                  onCheckedChange={(checked) => setValue('isEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token (Secret)</Label>
                <Input
                  id="accessToken"
                  type={showSecrets ? 'text' : 'password'}
                  placeholder="Secret из настроек пользователя АТС"
                  {...register('accessToken')}
                />
                <p className="text-xs text-muted-foreground">
                  Телефония → Пользователи АТС → Администратор → API → Secret
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Виртуальный номер</Label>
                  {hasToken && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadData}
                      disabled={numbersLoading}
                    >
                      {numbersLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {virtualNumbers && virtualNumbers.length > 0 ? (
                  <Select
                    value={selectedVirtualNumber || ''}
                    onValueChange={(value) => setValue('virtualPhoneNumber', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите виртуальный номер" />
                    </SelectTrigger>
                    <SelectContent>
                      {virtualNumbers.map((vn) => (
                        <SelectItem key={vn.id} value={vn.virtual_phone_number}>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            {formatPhoneNumber(vn.virtual_phone_number)}
                            {vn.name && <span className="text-muted-foreground">({vn.name})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="74951277155"
                    {...register('virtualPhoneNumber')}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Номер, с которого будут совершаться исходящие звонки
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Сотрудник по умолчанию</Label>
                  {hasToken && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadData}
                      disabled={employeesLoading}
                    >
                      {employeesLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {employees && employees.length > 0 ? (
                  <Select
                    value={selectedEmployeeId?.toString() || ''}
                    onValueChange={(value) => setValue('defaultEmployeeId', value ? parseInt(value, 10) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {emp.full_name}
                            <span className="text-muted-foreground">
                              (ext. {emp.extension.extension_phone_number})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    placeholder="ID сотрудника в Novofon"
                    onChange={(e) => setValue('defaultEmployeeId', e.target.value ? parseInt(e.target.value, 10) : null)}
                    value={selectedEmployeeId || ''}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  На чей телефон будет поступать callback при клике на номер
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showSecrets"
                  checked={showSecrets}
                  onChange={(e) => setShowSecrets(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showSecrets" className="text-sm cursor-pointer">
                  Показать токен
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сохранить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testConnection.isPending}
                >
                  {testConnection.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube2 className="mr-2 h-4 w-4" />
                  )}
                  Проверить подключение
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Информация */}
        <Card>
          <CardHeader>
            <CardTitle>Как это работает</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p>1. Оператор кликает на номер телефона клиента в системе</p>
              <p>2. Система отправляет запрос в Novofon Call API</p>
              <p>3. АТС звонит на телефон выбранного сотрудника</p>
              <p>4. Когда сотрудник поднимает трубку, АТС соединяет его с клиентом</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Настройка в ЛК Novofon:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Телефония → Пользователи АТС → Администратор</li>
                <li>2. Вкладка API → Включить «Использовать ключ API»</li>
                <li>3. Сгенерировать Secret и скопировать его</li>
                <li>4. Настройки → Правила безопасности → API</li>
                <li>5. Добавить IP сервера или 0.0.0.0/0</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* История звонков */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                История звонков
              </CardTitle>
              <CardDescription>
                Последние 20 звонков из системы
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : history?.calls && history.calls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Оператор</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.calls.map((call) => {
                  const statusInfo = callStatusLabels[call.status] || { label: call.status, variant: 'secondary' as const };
                  return (
                    <TableRow key={call.id}>
                      <TableCell className="text-sm">
                        {formatDate(call.createdAt)}
                      </TableCell>
                      <TableCell>
                        {call.user ? `${call.user.firstName} ${call.user.lastName}` : '—'}
                      </TableCell>
                      <TableCell>
                        {call.client ? (
                          <a
                            href={`/clients/${call.client.id}`}
                            className="text-primary hover:underline"
                          >
                            {call.client.firstName} {call.client.lastName}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatPhoneNumber(call.toNumber)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              История звонков пуста
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
