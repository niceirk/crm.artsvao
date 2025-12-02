'use client';

import { useMemo, useState, useRef } from 'react';
import { format, isSameDay, isBefore, startOfDay, isWeekend } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HourlyTimeSlot } from '@/lib/types/rental-applications';
import { useHourlyOccupancy } from '@/hooks/use-hourly-occupancy';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface HourlyTimeSlotGridProps {
  roomId: string;
  selectedDates: Date[];
  selectedSlots: HourlyTimeSlot[];
  onSlotToggle: (slot: HourlyTimeSlot) => void;
}

export function HourlyTimeSlotGrid({
  roomId,
  selectedDates,
  selectedSlots,
  onSlotToggle,
}: HourlyTimeSlotGridProps) {
  const [lastSelectedSlot, setLastSelectedSlot] = useState<{ dateIndex: number; hourIndex: number } | null>(null);
  // Часовые слоты от 9:00 до 21:00 (13 слотов: 9-10, 10-11, ..., 21-22)
  const hourSlots = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => 9 + i); // [9, 10, 11, ..., 21]
  }, []);

  // Загружаем занятость слотов
  const { occupiedSlots, isLoading: isLoadingAvailability } = useHourlyOccupancy(
    roomId,
    selectedDates
  );

  // Проверка: занят ли слот
  const isSlotOccupied = (date: Date, startHour: number): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotKey = `${dateStr}_${startHour}`;
    return occupiedSlots.has(slotKey);
  };

  // Проверка: выбран ли слот
  const isSlotSelected = (date: Date, startHour: number): boolean => {
    return selectedSlots.some(
      (slot) => isSameDay(slot.date, date) && slot.startHour === startHour
    );
  };

  // Проверка: прошедшая ли дата
  const isPastDate = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date()));
  };

  // Обработчик клика с поддержкой Shift для выделения/отмены диапазона
  const handleSlotClick = (dateIndex: number, hourIndex: number, event: React.MouseEvent) => {
    const date = selectedDates[dateIndex];
    const startHour = hourSlots[hourIndex];

    // Проверяем, что слот доступен
    const occupied = isSlotOccupied(date, startHour);
    const past = isPastDate(date);
    if (occupied || past) return;

    // Если зажат Shift и есть предыдущий выбор - работаем с диапазоном
    if (event.shiftKey && lastSelectedSlot) {
      const minDateIdx = Math.min(lastSelectedSlot.dateIndex, dateIndex);
      const maxDateIdx = Math.max(lastSelectedSlot.dateIndex, dateIndex);
      const minHourIdx = Math.min(lastSelectedSlot.hourIndex, hourIndex);
      const maxHourIdx = Math.max(lastSelectedSlot.hourIndex, hourIndex);

      // Собираем все доступные слоты в диапазоне
      const availableSlots: { date: Date; startHour: number }[] = [];
      for (let dIdx = minDateIdx; dIdx <= maxDateIdx; dIdx++) {
        for (let hIdx = minHourIdx; hIdx <= maxHourIdx; hIdx++) {
          const slotDate = selectedDates[dIdx];
          const slotHour = hourSlots[hIdx];
          const slotOccupied = isSlotOccupied(slotDate, slotHour);
          const slotPast = isPastDate(slotDate);

          if (!slotOccupied && !slotPast) {
            availableSlots.push({ date: slotDate, startHour: slotHour });
          }
        }
      }

      // Проверяем, все ли доступные слоты выбраны
      const allSelected = availableSlots.every(slot =>
        isSlotSelected(slot.date, slot.startHour)
      );

      // Если все выбраны - снимаем выделение, иначе - выделяем
      availableSlots.forEach(slot => {
        const slotSelected = isSlotSelected(slot.date, slot.startHour);

        if (allSelected && slotSelected) {
          // Снимаем выделение
          onSlotToggle({
            date: slot.date,
            startHour: slot.startHour,
            endHour: slot.startHour + 1,
          });
        } else if (!allSelected && !slotSelected) {
          // Выделяем
          onSlotToggle({
            date: slot.date,
            startHour: slot.startHour,
            endHour: slot.startHour + 1,
          });
        }
      });
    } else {
      // Обычный клик - переключаем слот
      onSlotToggle({
        date,
        startHour,
        endHour: startHour + 1,
      });
    }

    // Запоминаем последний выбранный слот
    setLastSelectedSlot({ dateIndex, hourIndex });
  };

  return (
    <div className="space-y-2">
      {/* Легенда */}
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

      {/* Таблица слотов */}
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="p-2">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-sm font-medium min-w-[140px] border-r">
                  Дата
                </th>
                {hourSlots.map((startHour) => (
                  <th
                    key={startHour}
                    className="px-1 py-2 text-center text-xs font-medium min-w-[50px]"
                  >
                    <div>{startHour}:00</div>
                    <div className="text-[10px] text-muted-foreground">
                      {startHour + 1}:00
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedDates.map((date, dateIndex) => (
                <tr key={date.toISOString()} className="border-t">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2 text-sm border-r">
                    <div className={cn(
                      "font-medium",
                      isWeekend(date) && "text-red-500"
                    )}>
                      {format(date, 'dd.MM (EEEEEE)', { locale: ru })}
                    </div>
                  </td>
                  {hourSlots.map((startHour, hourIndex) => {
                    const occupied = isSlotOccupied(date, startHour);
                    const selected = isSlotSelected(date, startHour);
                    const past = isPastDate(date);
                    const disabled = occupied || past;

                    return (
                      <td key={startHour} className="px-1 py-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={(e) => handleSlotClick(dateIndex, hourIndex, e)}
                          className={cn(
                            "w-12 h-12 rounded text-xs font-medium transition-colors",
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
                          {startHour}
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

      {/* Статистика выбранных слотов */}
      {selectedSlots.length > 0 && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-sm font-medium">
            Выбрано: {selectedSlots.length} слотов
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {Array.from(new Set(selectedSlots.map(s => format(s.date, 'yyyy-MM-dd')))).length} дней,{' '}
            всего {selectedSlots.length} часов
          </div>
        </div>
      )}
    </div>
  );
}
