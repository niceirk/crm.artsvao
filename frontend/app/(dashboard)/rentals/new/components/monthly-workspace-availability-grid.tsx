'use client';

import { useMemo } from 'react';
import { format, addDays, startOfDay, isWeekend, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workspace } from '@/lib/api/workspaces';
import { useWorkspacesAvailability } from '@/hooks/use-workspaces';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface MonthlyWorkspaceAvailabilityGridProps {
  workspaces: Workspace[];
  selectedWorkspaceIds: string[];
  onWorkspaceToggle: (workspaceId: string) => void;
  startDate: Date;
  endDate: Date;
}

export function MonthlyWorkspaceAvailabilityGrid({
  workspaces,
  selectedWorkspaceIds,
  onWorkspaceToggle,
  startDate,
  endDate,
}: MonthlyWorkspaceAvailabilityGridProps) {
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

  const { availabilityMap, isLoading: isLoadingAvailability } = useWorkspacesAvailability(
    workspaces,
    startDateStr,
    endDateStr
  );

  const isSlotOccupied = (workspaceId: string, date: Date): boolean => {
    const occupiedDates = availabilityMap.get(workspaceId);
    if (!occupiedDates) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return occupiedDates.includes(dateStr);
  };

  const isPastDate = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date()));
  };

  if (workspaces.length === 0) {
    return (
      <div className="p-6 text-center border rounded-lg border-dashed">
        <div className="text-muted-foreground">
          Выберите рабочие места чтобы увидеть доступность
        </div>
      </div>
    );
  }

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
        {isLoadingAvailability && (
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
                  Рабочее место
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
              {workspaces.map((ws) => {
                const isSelected = selectedWorkspaceIds.includes(ws.id);
                return (
                  <tr
                    key={ws.id}
                    className={cn(
                      "border-t transition-colors",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <td className={cn(
                      "sticky left-0 z-10 px-3 py-2 text-sm border-r transition-colors",
                      isSelected ? "bg-primary/5" : "bg-background"
                    )}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onWorkspaceToggle(ws.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {ws.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ws.monthlyRate} ₽/месяц
                          </div>
                        </div>
                      </div>
                    </td>
                  {dates.map((date) => {
                    const occupied = isSlotOccupied(ws.id, date);
                    const past = isPastDate(date);

                    return (
                      <td key={date.toISOString()} className="px-1 py-1">
                        <div
                          className={cn(
                            "w-8 h-8 rounded text-xs font-medium flex items-center justify-center",
                            occupied && "bg-red-100 text-red-400",
                            !occupied && !past && "bg-green-100 text-green-700",
                            past && !occupied && "bg-muted text-muted-foreground"
                          )}
                          title={
                            occupied
                              ? 'Занято'
                              : past
                              ? 'Прошедшая дата'
                              : 'Свободно'
                          }
                        >
                          {format(date, 'd')}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
              })}
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
