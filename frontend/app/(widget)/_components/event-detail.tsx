import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, MapPin, ArrowLeft, Users } from 'lucide-react';
import { Event } from '../_lib/api';
import { formatDate, formatTime } from '../_lib/utils';
import { RegistrationButton } from './registration-button';

interface EventDetailProps {
  event: Event;
}

export function EventDetail({ event }: EventDetailProps) {
  const getLocation = () => {
    if (!event.room) return null;

    const roomName = event.room.name;
    const roomNumber = event.room.number;

    // Для 91к1 и Концертного зала - адрес корпуса 1
    const isBuilding91 = roomName.includes('91к1') || roomName.includes('Концертный зал');

    if (isBuilding91) {
      return `ул. Октябрьская, 91 корпус 1 (Концертный зал)`;
    }

    return `ул. Октябрьская, 58 (${roomName})`;
  };

  const location = getLocation();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/widget/events">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Назад к мероприятиям
          </Link>
        </Button>
      </div>

      {/* Фото мероприятия */}
      {event.photoUrl && (
        <div className="w-full overflow-hidden rounded-lg mb-4">
          <img
            src={event.photoUrl}
            alt={event.name}
            className="w-full h-auto"
          />
        </div>
      )}

      <Card className="shadow-none">
        <CardContent className="pt-6">
          {/* Название */}
          <h1 className="text-2xl font-bold mb-3">{event.name}</h1>

          {/* Возрастная маркировка и формат - под названием */}
          {(event.ageRating || event.eventFormat || event.isForChildren || event.eventType) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {event.ageRating && (
                <Badge variant="secondary" className="text-sm px-3 py-1">{event.ageRating}</Badge>
              )}
              {event.eventFormat && (
                <Badge variant="outline" className="text-sm px-3 py-1">{event.eventFormat}</Badge>
              )}
              {event.isForChildren && (
                <Badge variant="outline" className="text-sm px-3 py-1">Для детей</Badge>
              )}
              {event.eventType && (
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1"
                  style={event.eventType.color ? { backgroundColor: event.eventType.color, color: '#fff' } : undefined}
                >
                  {event.eventType.name}
                </Badge>
              )}
            </div>
          )}

          {/* Описание */}
          {(event.fullDescription || event.description) && (
            <div className="prose prose-sm max-w-none mb-6">
              <p className="whitespace-pre-wrap">
                {event.fullDescription || event.description}
              </p>
            </div>
          )}

          {/* Возрастная информация */}
          {event.ageDescription && (
            <div className="border-t pt-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Для гостей возраста:</h3>
              <p className="text-sm text-muted-foreground">
                {event.ageDescription}
              </p>
            </div>
          )}

          {/* Дата, время, место */}
          <div className="grid gap-3 text-sm mb-6 border-t pt-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="font-medium">{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
            </div>
            {location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>{location}</span>
              </div>
            )}
            {event.maxCapacity && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>
                  {event.participants !== null && event.participants !== undefined
                    ? `${event.participants} / ${event.maxCapacity} мест`
                    : `${event.maxCapacity} мест`}
                </span>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Плавающая кнопка записи */}
      {event.timepadLink && (
        <RegistrationButton
          eventId={event.id}
          eventName={event.name}
          timepadLink={event.timepadLink}
          maxCapacity={event.maxCapacity}
        />
      )}

      {/* Отступ снизу для плавающей кнопки */}
      {event.timepadLink && <div className="h-24" />}
    </div>
  );
}
