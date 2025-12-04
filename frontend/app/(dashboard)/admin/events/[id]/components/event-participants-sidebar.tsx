'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Event } from '@/lib/api/events';
import { useTimepadParticipants } from '@/hooks/use-timepad-participants';
import {
  Users,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  Ticket,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EventParticipantsSidebarProps {
  event: Event;
}

export function EventParticipantsSidebar({ event }: EventParticipantsSidebarProps) {
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const maxCapacity = event.maxCapacity || 0;
  const hasCapacityData = maxCapacity > 0;

  // Загружаем участников из Timepad если есть ссылка
  const {
    data: timepadData,
    isLoading: isLoadingTimepad,
    error: timepadError,
    refetch: refetchTimepad,
    isFetching,
  } = useTimepadParticipants(event.timepadLink, { limit: 100 });

  const hasTimepadLink = !!event.timepadLink;
  const timepadParticipants = timepadData?.participants || [];
  const timepadTotal = timepadData?.total || 0;

  // Используем данные из Timepad если доступны, иначе из события
  const actualParticipants = hasTimepadLink && timepadData ? timepadTotal : (event.participants || 0);
  const fillPercentage = hasCapacityData ? (actualParticipants / maxCapacity) * 100 : 0;
  const availableSeats = Math.max(0, maxCapacity - actualParticipants);
  const displayedParticipants = showAllParticipants
    ? timepadParticipants
    : timepadParticipants.slice(0, 5);

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
          {hasCapacityData || (hasTimepadLink && timepadTotal > 0) ? (
            <>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    {hasTimepadLink ? 'Зарегистрировано в Timepad' : 'Заявлено участников'}
                  </div>
                  <div className="text-3xl font-bold">
                    {actualParticipants}
                  </div>
                  {hasCapacityData && (
                    <div className="text-xs text-muted-foreground mt-1">
                      из {maxCapacity}
                    </div>
                  )}
                </div>

                {hasCapacityData && (
                  <div className="space-y-1.5">
                    <Progress value={fillPercentage} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Заполненность</span>
                      <span className="font-medium">{Math.round(fillPercentage)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {hasCapacityData && (
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
              )}
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

      {/* Список участников из Timepad */}
      {hasTimepadLink && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Регистрации Timepad
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => refetchTimepad()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Участники, зарегистрированные через Timepad
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTimepad ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timepadError ? (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive opacity-70" />
                <p className="text-xs text-muted-foreground mb-2">
                  Не удалось загрузить участников
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchTimepad()}
                >
                  Повторить
                </Button>
              </div>
            ) : timepadParticipants.length === 0 ? (
              <div className="text-center py-4">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">
                  Пока нет зарегистрированных участников
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <ScrollArea className={showAllParticipants && timepadParticipants.length > 5 ? 'h-[300px]' : ''}>
                  <div className="space-y-2">
                    {displayedParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {participant.isPaid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {participant.name}
                            </span>
                            {participant.tickets.length > 1 && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                {participant.tickets.length}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{participant.email}</span>
                          </div>
                          {participant.tickets[0] && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {participant.tickets[0].ticketType}
                              {participant.paymentAmount && participant.paymentAmount !== '0' && (
                                <span className="ml-1">
                                  ({participant.paymentAmount} руб.)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {timepadParticipants.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs"
                    onClick={() => setShowAllParticipants(!showAllParticipants)}
                  >
                    {showAllParticipants ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Свернуть
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Показать всех ({timepadParticipants.length})
                      </>
                    )}
                  </Button>
                )}

                {timepadTotal > timepadParticipants.length && (
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Показано {timepadParticipants.length} из {timepadTotal}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
