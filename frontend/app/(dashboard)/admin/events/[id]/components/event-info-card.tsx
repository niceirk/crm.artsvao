'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Event } from '@/lib/api/events';
import { Calendar, Clock, MapPin, User, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

interface EventInfoCardProps {
  event: Event;
}

export function EventInfoCard({ event }: EventInfoCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      // Обработка ISO формата (1970-01-01T18:00:00.000Z или 1970-01-01T18:00)
      if (timeString.includes('T')) {
        const timePart = timeString.split('T')[1];
        const [hours, minutes] = timePart.split(':');
        return `${hours}:${minutes}`;
      }
      // Обработка формата HH:MM:SS или HH:MM
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeString;
    }
  };

  const calculateDuration = () => {
    try {
      let startH, startM, endH, endM;

      // Обработка ISO формата для startTime
      if (event.startTime.includes('T')) {
        const timePart = event.startTime.split('T')[1];
        [startH, startM] = timePart.split(':').map(Number);
      } else {
        [startH, startM] = event.startTime.split(':').map(Number);
      }

      // Обработка ISO формата для endTime
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
      console.error('Error calculating duration:', error);
      return '-';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Основная информация
        </CardTitle>
        <CardDescription>Ключевые данные о мероприятии</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <dt className="text-sm font-medium text-muted-foreground">Дата</dt>
              <dd className="text-sm mt-1">{formatDate(event.date)}</dd>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <dt className="text-sm font-medium text-muted-foreground">Время</dt>
              <dd className="text-sm mt-1">
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                <span className="text-muted-foreground ml-2">
                  ({calculateDuration()})
                </span>
              </dd>
            </div>
          </div>

          {/* Event Type */}
          {event.eventType && (
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Тип мероприятия
                </dt>
                <dd className="text-sm mt-1">
                  <Link
                    href={`/admin/event-types`}
                    className="hover:underline"
                  >
                    {event.eventType.name}
                  </Link>
                </dd>
              </div>
            </div>
          )}

          {/* Room */}
          {event.room && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Помещение
                </dt>
                <dd className="text-sm mt-1">
                  <Link
                    href={`/admin/rooms`}
                    className="hover:underline"
                  >
                    {event.room.name}
                    {event.room.number && ` №${event.room.number}`}
                  </Link>
                </dd>
              </div>
            </div>
          )}

          {/* Responsible User */}
          {event.responsibleUser && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Ответственный
                </dt>
                <dd className="text-sm mt-1">
                  {event.responsibleUser.firstName} {event.responsibleUser.lastName}
                  <span className="text-muted-foreground ml-2">
                    ({event.responsibleUser.email})
                  </span>
                </dd>
              </div>
            </div>
          )}

          {/* Event Format */}
          {event.eventFormat && (
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <dt className="text-sm font-medium text-muted-foreground">Формат</dt>
                <dd className="text-sm mt-1">{event.eventFormat}</dd>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
