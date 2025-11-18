'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Event } from '@/lib/api/events';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Tag,
  DollarSign,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

interface EventMainInfoCardProps {
  event: Event;
}

export function EventMainInfoCard({ event }: EventMainInfoCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      if (timeString.includes('T')) {
        const timePart = timeString.split('T')[1];
        const [hours, minutes] = timePart.split(':');
        return `${hours}:${minutes}`;
      }
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeString;
    }
  };

  const calculateDuration = () => {
    try {
      let startH, startM, endH, endM;

      if (event.startTime.includes('T')) {
        const timePart = event.startTime.split('T')[1];
        [startH, startM] = timePart.split(':').map(Number);
      } else {
        [startH, startM] = event.startTime.split(':').map(Number);
      }

      if (event.endTime.includes('T')) {
        const timePart = event.endTime.split('T')[1];
        [endH, endM] = timePart.split(':').map(Number);
      } else {
        [endH, endM] = event.endTime.split(':').map(Number);
      }

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const durationMinutes = endMinutes - startMinutes;

      if (durationMinutes <= 0) return '-';

      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

      if (hours > 0 && minutes > 0) {
        return `${hours} ч ${minutes} мин`;
      } else if (hours > 0) {
        return `${hours} ч`;
      } else {
        return `${minutes} мин`;
      }
    } catch (error) {
      return '-';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Информация о мероприятии
        </CardTitle>
        <CardDescription>Полная информация о мероприятии</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные данные */}
        <div className="grid gap-4">
          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Дата</dt>
                <dd className="text-sm mt-1">{formatDate(event.date)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Время</dt>
                <dd className="text-sm mt-1">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  <span className="text-muted-foreground ml-2">
                    ({calculateDuration()})
                  </span>
                </dd>
              </div>
            </div>
          </div>

          {/* Type and Room */}
          <div className="flex items-start gap-3">
            <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {event.eventType && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Тип мероприятия
                  </dt>
                  <dd className="text-sm mt-1">
                    <Link href="/admin/event-types" className="hover:underline">
                      {event.eventType.name}
                    </Link>
                  </dd>
                </div>
              )}
              {event.room && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Помещение
                  </dt>
                  <dd className="text-sm mt-1">
                    <Link href="/admin/rooms" className="hover:underline">
                      {event.room.name}
                      {event.room.number && ` №${event.room.number}`}
                    </Link>
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* Responsible and Format */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {event.responsibleUser && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Ответственный
                  </dt>
                  <dd className="text-sm mt-1">
                    {event.responsibleUser.firstName} {event.responsibleUser.lastName}
                    <div className="text-xs text-muted-foreground">
                      {event.responsibleUser.email}
                    </div>
                  </dd>
                </div>
              )}
              {event.eventFormat && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Формат</dt>
                  <dd className="text-sm mt-1">{event.eventFormat}</dd>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Финансы */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
            <DollarSign className="h-4 w-4" />
            Финансовая информация
          </h4>
          <div className="space-y-3">
            {event.budget && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Бюджет</dt>
                <dd className="text-xl font-bold mt-1">
                  {formatCurrency(Number(event.budget))}
                </dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-1">
                  Тип
                </dt>
                <dd>
                  <Badge variant={event.isPaid ? 'default' : 'outline'}>
                    {event.isPaid ? 'Платное' : 'Бесплатное'}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-1">
                  Госзадание
                </dt>
                <dd className="flex items-center gap-2">
                  {event.isGovernmentTask ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Да</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Нет</span>
                    </>
                  )}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
