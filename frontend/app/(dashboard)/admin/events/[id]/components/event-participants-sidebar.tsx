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

interface EventParticipantsSidebarProps {
  event: Event;
}

export function EventParticipantsSidebar({ event }: EventParticipantsSidebarProps) {
  const participants = event.participants || 0;
  const maxCapacity = event.maxCapacity || 0;
  const hasCapacityData = maxCapacity > 0;
  const fillPercentage = hasCapacityData ? (participants / maxCapacity) * 100 : 0;
  const availableSeats = Math.max(0, maxCapacity - participants);

  return (
    <div className="space-y-4">
      {/* Статистика участников */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Участники
          </CardTitle>
          <CardDescription className="text-xs">
            Статистика посещаемости
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasCapacityData ? (
            <>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    Заявлено участников
                  </div>
                  <div className="text-3xl font-bold">{participants}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    из {maxCapacity}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Progress value={fillPercentage} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Заполненность</span>
                    <span className="font-medium">{Math.round(fillPercentage)}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Свободно мест
                  </span>
                  <span className="text-sm font-semibold">{availableSeats}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Максимум
                  </span>
                  <span className="text-sm font-semibold">{maxCapacity}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-xs text-muted-foreground">
                Данные об участниках не указаны
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Список участников - заглушка на будущее */}
      {hasCapacityData && participants > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Список участников</CardTitle>
            <CardDescription className="text-xs">
              Зарегистрированные участники мероприятия
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">
                Список участников будет доступен в следующей версии
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
