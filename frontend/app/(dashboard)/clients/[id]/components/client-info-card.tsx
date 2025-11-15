'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileText } from 'lucide-react';
import type { Client } from '@/lib/types/clients';

interface ClientInfoCardProps {
  client: Client;
}

const genderLabels: Record<string, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
  OTHER: 'Другой',
};

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateAge = (dateOfBirth: string | null | undefined) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(client.dateOfBirth);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Основная информация
        </CardTitle>
        <CardDescription>
          Личные данные клиента
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Фамилия</dt>
            <dd className="text-sm mt-1">{client.lastName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Имя</dt>
            <dd className="text-sm mt-1">{client.firstName}</dd>
          </div>
          {client.middleName && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Отчество</dt>
              <dd className="text-sm mt-1">{client.middleName}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Пол</dt>
            <dd className="text-sm mt-1">
              {client.gender ? genderLabels[client.gender] : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Дата рождения
            </dt>
            <dd className="text-sm mt-1">
              {formatDate(client.dateOfBirth)}
              {age && <span className="text-muted-foreground ml-2">({age} лет)</span>}
            </dd>
          </div>
          {client.address && (
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Адрес</dt>
              <dd className="text-sm mt-1">{client.address}</dd>
            </div>
          )}
        </div>

        {client.notes && (
          <div className="pt-4 border-t">
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
              <FileText className="h-3 w-3" />
              Заметки
            </dt>
            <dd className="text-sm text-muted-foreground whitespace-pre-wrap">
              {client.notes}
            </dd>
          </div>
        )}

        <div className="pt-4 border-t grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Создан:</span>{' '}
            {formatDate(client.createdAt)}
          </div>
          <div>
            <span className="font-medium">Обновлен:</span>{' '}
            {formatDate(client.updatedAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
