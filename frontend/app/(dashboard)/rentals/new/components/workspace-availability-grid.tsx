'use client';

import { useMemo, useState } from 'react';
import { format, addDays, isSameDay, startOfDay, isWeekend, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workspace } from '@/lib/api/workspaces';
import { useWorkspacesAvailability } from '@/hooks/use-workspaces';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface SelectedSlot {
  workspaceId: string;
  date: Date;
}

interface WorkspaceAvailabilityGridProps {
  workspaces: Workspace[];
  selectedSlots: SelectedSlot[];
  onSlotToggle: (workspaceId: string, date: Date) => void;
}

export function WorkspaceAvailabilityGrid({
  workspaces,
  selectedSlots,
  onSlotToggle,
}: WorkspaceAvailabilityGridProps) {
  const [lastSelectedSlot, setLastSelectedSlot] = useState<{ workspaceIndex: number; dateIndex: number } | null>(null);
  // Генерируем даты на месяц вперёд
  const dates = useMemo(() => {
    const today = startOfDay(new Date());
    const result: Date[] = [];
    for (let i = 0; i < 30; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []);

  const startDate = format(dates[0], 'yyyy-MM-dd');
  const endDate = format(dates[dates.length - 1], 'yyyy-MM-dd');

  const { availabilityMap, isLoading: isLoadingAvailability } = useWorkspacesAvailability(
    workspaces,
    startDate,
    endDate
  );

  // Отладка
  console.log('WorkspaceAvailabilityGrid:', {
    workspacesCount: workspaces.length,
    workspaceIds: workspaces.map(ws => ws.id),
    startDate,
    endDate,
    isLoadingAvailability,
    availabilityMapSize: availabilityMap.size,
  });

  const isSlotOccupied = (workspaceId: string, date: Date): boolean => {
    const occupiedDates = availabilityMap.get(workspaceId);
    if (!occupiedDates) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return occupiedDates.includes(dateStr);
  };

  const isSlotSelected = (workspaceId: string, date: Date): boolean => {
    return selectedSlots.some(
      (slot) => slot.workspaceId === workspaceId && isSameDay(slot.date, date)
    );
  };

  const isPastDate = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date()));
  };

  // Обработчик клика с поддержкой Shift для выделения/отмены диапазона
  const handleSlotClick = (workspaceIndex: number, dateIndex: number, event: React.MouseEvent) => {
    const workspace = workspaces[workspaceIndex];
    const date = dates[dateIndex];

    // Проверяем, что слот доступен
    const occupied = isSlotOccupied(workspace.id, date);
    const past = isPastDate(date);
    if (occupied || past) return;

    // Если зажат Shift и есть предыдущий выбор - работаем с диапазоном
    if (event.shiftKey && lastSelectedSlot) {
      const minWsIdx = Math.min(lastSelectedSlot.workspaceIndex, workspaceIndex);
      const maxWsIdx = Math.max(lastSelectedSlot.workspaceIndex, workspaceIndex);
      const minDateIdx = Math.min(lastSelectedSlot.dateIndex, dateIndex);
      const maxDateIdx = Math.max(lastSelectedSlot.dateIndex, dateIndex);

      // Собираем все доступные слоты в диапазоне
      const availableSlots: { workspaceId: string; date: Date }[] = [];
      for (let wsIdx = minWsIdx; wsIdx <= maxWsIdx; wsIdx++) {
        for (let dIdx = minDateIdx; dIdx <= maxDateIdx; dIdx++) {
          const slotWorkspace = workspaces[wsIdx];
          const slotDate = dates[dIdx];
          const slotOccupied = isSlotOccupied(slotWorkspace.id, slotDate);
          const slotPast = isPastDate(slotDate);

          if (!slotOccupied && !slotPast) {
            availableSlots.push({ workspaceId: slotWorkspace.id, date: slotDate });
          }
        }
      }

      // Проверяем, все ли доступные слоты выбраны
      const allSelected = availableSlots.every(slot =>
        isSlotSelected(slot.workspaceId, slot.date)
      );

      // Если все выбраны - снимаем выделение, иначе - выделяем
      availableSlots.forEach(slot => {
        const slotSelected = isSlotSelected(slot.workspaceId, slot.date);

        if (allSelected && slotSelected) {
          // Снимаем выделение
          onSlotToggle(slot.workspaceId, slot.date);
        } else if (!allSelected && !slotSelected) {
          // Выделяем
          onSlotToggle(slot.workspaceId, slot.date);
        }
      });
    } else {
      // Обычный клик - переключаем слот
      onSlotToggle(workspace.id, date);
    }

    // Запоминаем последний выбранный слот
    setLastSelectedSlot({ workspaceIndex, dateIndex });
  };

  // Показываем таблицу даже если availability еще загружается
  // Занятые слоты будут отмечены после загрузки

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
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-primary border border-primary" />
            <span>Выбрано</span>
          </div>
        </div>
        {isLoadingAvailability && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>Проверка занятости...</span>
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
              {workspaces.map((ws, workspaceIndex) => (
                <tr key={ws.id} className="border-t">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2 text-sm border-r">
                    <div className="font-medium">
                      {ws.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ws.dailyRate} ₽/день
                    </div>
                  </td>
                  {dates.map((date, dateIndex) => {
                    const occupied = isSlotOccupied(ws.id, date);
                    const selected = isSlotSelected(ws.id, date);
                    const past = isPastDate(date);
                    const disabled = occupied || past;

                    return (
                      <td key={date.toISOString()} className="px-1 py-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={(e) => handleSlotClick(workspaceIndex, dateIndex, e)}
                          className={cn(
                            "w-8 h-8 rounded text-xs font-medium transition-colors",
                            // Выбрано
                            selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                            // Занято
                            occupied && !selected && "bg-red-100 text-red-400 cursor-not-allowed",
                            // Свободно
                            !occupied && !selected && !past && "bg-green-100 hover:bg-green-200 text-green-700 cursor-pointer",
                            // Прошедшая дата
                            past && !occupied && "bg-muted text-muted-foreground cursor-not-allowed"
                          )}
                          title={
                            occupied
                              ? 'Занято'
                              : past
                              ? 'Прошедшая дата'
                              : selected
                              ? 'Кликните чтобы отменить выбор'
                              : 'Кликните чтобы выбрать (Shift для диапазона)'
                          }
                        >
                          {format(date, 'd')}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {selectedSlots.length > 0 && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-sm font-medium">
            Выбрано: {selectedSlots.length} слотов
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {Array.from(new Set(selectedSlots.map(s => s.workspaceId))).length} рабочих мест,{' '}
            {Array.from(new Set(selectedSlots.map(s => format(s.date, 'yyyy-MM-dd')))).length} дней
          </div>
        </div>
      )}
    </div>
  );
}
