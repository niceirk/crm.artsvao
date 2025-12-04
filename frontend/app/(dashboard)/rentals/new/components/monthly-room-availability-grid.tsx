'use client';

import { useMemo } from 'react';
import { format, addDays, startOfDay, isWeekend, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Room } from '@/lib/api/rooms';
import { useRoomMonthlyOccupancy } from '@/hooks/use-room-monthly-occupancy';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MonthlyRoomAvailabilityGridProps {
  room: Room;
  startDate: Date;
  endDate: Date;
}

export function MonthlyRoomAvailabilityGrid({
  room,
  startDate,
  endDate,
}: MonthlyRoomAvailabilityGridProps) {
  // Generate dates array from startDate to endDate
  const dates = useMemo(() => {
    const result: Date[] = [];
    let current = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (current <= end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [startDate, endDate]);

  const startDateStr = format(dates[0], 'yyyy-MM-dd');
  const endDateStr = format(dates[dates.length - 1], 'yyyy-MM-dd');

  const { occupancyMap, isLoading } = useRoomMonthlyOccupancy(
    room.id,
    startDateStr,
    endDateStr
  );

  const getOccupancy = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return occupancyMap[dateStr] || null;
  };

  const isPastDate = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date()));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
            <span>Свободно</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
            <span>Занято</span>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>Загрузка доступности...</span>
          </div>
        )}
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="p-2">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-sm font-medium min-w-[180px] border-r">
                  Помещение
                </th>
                {dates.map((date) => (
                  <th
                    key={date.toISOString()}
                    className={cn(
                      "px-1 py-2 text-center text-xs font-medium min-w-[40px]",
                      isWeekend(date) && "text-red-500"
                    )}
                  >
                    <div>{format(date, 'd', { locale: ru })}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(date, 'EEEEEE', { locale: ru })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="sticky left-0 z-10 bg-background px-3 py-2 text-sm border-r">
                  <div className="flex-1">
                    <div className="font-medium">
                      {room.name}
                      {room.number && ` №${room.number}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {room.monthlyRateCoworking} ₽/месяц
                    </div>
                  </div>
                </td>
                <TooltipProvider>
                  {dates.map((date) => {
                    const occupancy = getOccupancy(date);
                    const past = isPastDate(date);

                    return (
                      <td key={date.toISOString()} className="px-1 py-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-8 h-8 rounded text-xs font-medium flex items-center justify-center cursor-default",
                                occupancy && "bg-red-100 text-red-400",
                                !occupancy && !past && "bg-green-100 text-green-700",
                                past && !occupancy && "bg-muted text-muted-foreground"
                              )}
                            >
                              {format(date, 'd')}
                            </div>
                          </TooltipTrigger>
                          {occupancy && (
                            <TooltipContent>
                              <p className="text-sm">{occupancy.description}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    );
                  })}
                </TooltipProvider>
              </tr>
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-900">
          <strong>Период:</strong> {format(startDate, 'PPP', { locale: ru })} — {format(endDate, 'PPP', { locale: ru })}
          {' '}({dates.length} {dates.length === 1 ? 'день' : dates.length < 5 ? 'дня' : 'дней'})
        </div>
      </div>
    </div>
  );
}
