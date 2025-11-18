'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Event } from '@/lib/api/events';
import { Users } from 'lucide-react';

interface EventParticipantsCardProps {
  event: Event;
}

export function EventParticipantsCard({ event }: EventParticipantsCardProps) {
  const participants = event.participants || 0;
  const maxCapacity = event.maxCapacity || 0;
  const hasData = maxCapacity > 0;
  const fillPercentage = hasData ? (participants / maxCapacity) * 100 : 0;
  const availableSeats = Math.max(0, maxCapacity - participants);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Участники и вместимость
        </CardTitle>
        <CardDescription>Информация о заполненности мероприятия</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Заявлено участников
                </dt>
                <dd className="text-2xl font-bold mt-1">{participants}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Максимум
                </dt>
                <dd className="text-2xl font-bold mt-1">{maxCapacity}</dd>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Заполненность</span>
                <span className="font-medium">{Math.round(fillPercentage)}%</span>
              </div>
              <Progress value={fillPercentage} className="h-2" />
            </div>

            <div className="pt-2 border-t">
              <dt className="text-sm font-medium text-muted-foreground">
                Свободных мест
              </dt>
              <dd className="text-lg font-semibold mt-1">
                {availableSeats} {availableSeats === 1 ? 'место' : 'мест'}
              </dd>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Данные об участниках не указаны</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
