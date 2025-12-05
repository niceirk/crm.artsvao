'use client';

import { useMemo, useState } from 'react';
import { format, isSameDay, isBefore, startOfDay, isWeekend } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HourlyTimeSlot, OccupiedInterval } from '@/lib/types/rental-applications';
import { useHourlyOccupancy } from '@/hooks/use-hourly-occupancy';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HourlyTimeSlotGridProps {
  roomId: string;
  selectedDates: Date[];
  selectedSlots: HourlyTimeSlot[];
  onSlotToggle: (slot: HourlyTimeSlot) => void;
}

// Компонент выбора времени и длительности
interface TimeSlotSelectorProps {
  date: Date;
  baseHour: number;
  occupiedIntervals: OccupiedInterval[];
  existingSlots: HourlyTimeSlot[];
  onConfirm: (slot: HourlyTimeSlot) => void;
  onClose: () => void;
}

function TimeSlotSelector({
  date,
  baseHour,
  occupiedIntervals,
  existingSlots,
  onConfirm,
  onClose,
}: TimeSlotSelectorProps) {
  const [startMinute, setStartMinute] = useState(0);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);

  // Расчет времени окончания
  const totalDurationMinutes = durationHours * 60 + durationMinutes;
  const startTimeMinutes = baseHour * 60 + startMinute;
  const endTimeMinutes = startTimeMinutes + totalDurationMinutes;
  const endHour = Math.floor(endTimeMinutes / 60);
  const endMinute = endTimeMinutes % 60;

  // Проверка конфликтов с занятыми интервалами
  const hasConflict = (sHour: number, sMin: number, eHour: number, eMin: number): boolean => {
    const slotStart = sHour * 60 + sMin;
    const slotEnd = eHour * 60 + eMin;

    // Проверяем конфликт с занятыми интервалами
    const occupiedConflict = occupiedIntervals.some(interval => {
      const occStart = interval.startHour * 60 + interval.startMinute;
      const occEnd = interval.endHour * 60 + interval.endMinute;
      return slotStart < occEnd && slotEnd > occStart;
    });

    if (occupiedConflict) return true;

    // Проверяем конфликт с уже выбранными слотами
    const existingConflict = existingSlots.some(slot => {
      if (!isSameDay(slot.date, date)) return false;
      const existStart = slot.startHour * 60 + slot.startMinute;
      const existEnd = slot.endHour * 60 + slot.endMinute;
      return slotStart < existEnd && slotEnd > existStart;
    });

    return existingConflict;
  };

  // Проверка доступности начального времени
  const isStartTimeOccupied = (minute: number): boolean => {
    // Минимальная длительность - 60 минут
    const minEndHour = Math.floor((baseHour * 60 + minute + 60) / 60);
    const minEndMinute = (baseHour * 60 + minute + 60) % 60;
    return hasConflict(baseHour, minute, minEndHour, minEndMinute);
  };

  // Максимальная длительность (до 22:00 или до следующего занятого интервала)
  const getMaxDuration = (): number => {
    const startMin = baseHour * 60 + startMinute;
    let maxEnd = 22 * 60; // До 22:00

    // Находим ближайший занятый интервал
    for (const interval of occupiedIntervals) {
      const occStart = interval.startHour * 60 + interval.startMinute;
      if (occStart > startMin && occStart < maxEnd) {
        maxEnd = occStart;
      }
    }

    // Проверяем существующие слоты
    for (const slot of existingSlots) {
      if (!isSameDay(slot.date, date)) continue;
      const existStart = slot.startHour * 60 + slot.startMinute;
      if (existStart > startMin && existStart < maxEnd) {
        maxEnd = existStart;
      }
    }

    return maxEnd - startMin;
  };

  const maxDurationMinutes = getMaxDuration();
  const maxHours = Math.floor(maxDurationMinutes / 60);

  // Валидация
  const isValid =
    totalDurationMinutes >= 60 && // Минимум 60 минут
    endHour <= 22 && // Не позже 22:00
    (endHour < 22 || endMinute === 0) && // Если 22 часа, то только :00
    totalDurationMinutes <= maxDurationMinutes &&
    !hasConflict(baseHour, startMinute, endHour, endMinute);

  // Доступные варианты часов
  const availableHours = useMemo(() => {
    const hours: number[] = [];
    for (let h = 0; h <= maxHours; h++) {
      // Для 0 часов нужно минимум 60 минут
      if (h === 0) continue;
      hours.push(h);
    }
    return hours;
  }, [maxHours]);

  // Доступные варианты минут
  const availableMinutes = useMemo(() => {
    const minutes: number[] = [];
    for (const m of [0, 15, 30, 45]) {
      const total = durationHours * 60 + m;
      if (total >= 60 && total <= maxDurationMinutes) {
        // Проверяем что не выходим за 22:00
        const potentialEndMinutes = startTimeMinutes + total;
        const potentialEndHour = Math.floor(potentialEndMinutes / 60);
        if (potentialEndHour <= 22) {
          minutes.push(m);
        }
      }
    }
    return minutes;
  }, [durationHours, maxDurationMinutes, startTimeMinutes]);

  // При изменении часов проверяем минуты
  const handleHoursChange = (hours: string) => {
    const h = parseInt(hours);
    setDurationHours(h);
    // Если текущие минуты недоступны, сбрасываем на 0
    const newTotal = h * 60 + durationMinutes;
    if (newTotal < 60 || newTotal > maxDurationMinutes) {
      setDurationMinutes(0);
    }
  };

  return (
    <div className="p-4 space-y-4 w-72">
      {/* Время начала */}
      <div>
        <Label className="text-sm font-medium">Время начала</Label>
        <div className="flex gap-1 mt-2">
          {[0, 15, 30, 45].map(min => {
            const isDisabled = isStartTimeOccupied(min);
            const isSelected = startMinute === min;
            return (
              <Button
                key={min}
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => {
                  setStartMinute(min);
                  // Пересчитываем максимальную длительность
                }}
                disabled={isDisabled}
                className={cn(
                  'flex-1',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                :{min.toString().padStart(2, '0')}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Длительность */}
      <div>
        <Label className="text-sm font-medium">Длительность</Label>
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Часы</Label>
            <Select
              value={durationHours.toString()}
              onValueChange={handleHoursChange}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableHours.map(h => (
                  <SelectItem key={h} value={h.toString()}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Минуты</Label>
            <Select
              value={durationMinutes.toString()}
              onValueChange={(v) => setDurationMinutes(parseInt(v))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMinutes.map(m => (
                  <SelectItem key={m} value={m.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Итого */}
      <div className="p-3 bg-muted rounded-lg">
        <div className="text-sm font-medium">
          {baseHour}:{startMinute.toString().padStart(2, '0')} — {endHour}:{endMinute.toString().padStart(2, '0')}
        </div>
        <div className="text-xs text-muted-foreground">
          {durationHours > 0 && `${durationHours} ч`}
          {durationMinutes > 0 && ` ${durationMinutes} мин`}
          {durationHours === 0 && durationMinutes === 0 && '0 мин'}
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          Отмена
        </Button>
        <Button
          className="flex-1"
          disabled={!isValid}
          onClick={() => {
            onConfirm({
              date,
              startHour: baseHour,
              startMinute,
              endHour,
              endMinute,
            });
            onClose();
          }}
        >
          Добавить
        </Button>
      </div>
    </div>
  );
}

// Форматирование слота для отображения
function formatSlotDisplay(slot: HourlyTimeSlot): string {
  const start = `${slot.startHour}:${slot.startMinute.toString().padStart(2, '0')}`;
  const end = `${slot.endHour}:${slot.endMinute.toString().padStart(2, '0')}`;
  return `${start}-${end}`;
}

export function HourlyTimeSlotGrid({
  roomId,
  selectedDates,
  selectedSlots,
  onSlotToggle,
}: HourlyTimeSlotGridProps) {
  const [openPopover, setOpenPopover] = useState<{ dateIndex: number; hourIndex: number } | null>(null);

  // Часовые слоты от 9:00 до 21:00 (13 слотов: 9-10, 10-11, ..., 21-22)
  const hourSlots = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => 9 + i); // [9, 10, 11, ..., 21]
  }, []);

  // Загружаем занятость слотов
  const { occupiedSlots, occupiedIntervals, isLoading: isLoadingAvailability } = useHourlyOccupancy(
    roomId,
    selectedDates
  );

  // Получить интервалы для конкретной даты
  const getIntervalsForDate = (date: Date): OccupiedInterval[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return occupiedIntervals.get(dateStr) || [];
  };

  // Проверка: полностью занят ли час
  const isHourFullyOccupied = (date: Date, startHour: number): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotKey = `${dateStr}_${startHour}`;
    return occupiedSlots.has(slotKey);
  };

  // Проверка: частично занят ли час
  const isHourPartiallyOccupied = (date: Date, startHour: number): boolean => {
    const intervals = getIntervalsForDate(date);
    if (intervals.length === 0) return false;

    const hourStart = startHour * 60;
    const hourEnd = (startHour + 1) * 60;

    return intervals.some(interval => {
      const intStart = interval.startHour * 60 + interval.startMinute;
      const intEnd = interval.endHour * 60 + interval.endMinute;
      // Частичное пересечение, но не полное
      const hasOverlap = intStart < hourEnd && intEnd > hourStart;
      const isFullyContained = intStart <= hourStart && intEnd >= hourEnd;
      return hasOverlap && !isFullyContained;
    });
  };

  // Проверка: выбран ли слот в этом часе
  const getSelectedSlotForHour = (date: Date, startHour: number): HourlyTimeSlot | null => {
    return selectedSlots.find(
      (slot) => isSameDay(slot.date, date) && slot.startHour === startHour
    ) || null;
  };

  // Проверка: прошедшая ли дата
  const isPastDate = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date()));
  };

  // Обработчик удаления слота
  const handleRemoveSlot = (slot: HourlyTimeSlot) => {
    onSlotToggle(slot);
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
            <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" />
            <span>Частично</span>
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
                    className="px-1 py-2 text-center text-xs font-medium min-w-[56px]"
                  >
                    <div>{startHour}:00</div>
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
                    const fullyOccupied = isHourFullyOccupied(date, startHour);
                    const partiallyOccupied = isHourPartiallyOccupied(date, startHour);
                    const selectedSlot = getSelectedSlotForHour(date, startHour);
                    const past = isPastDate(date);
                    const disabled = fullyOccupied || past;
                    const isOpen = openPopover?.dateIndex === dateIndex && openPopover?.hourIndex === hourIndex;

                    return (
                      <td key={startHour} className="px-1 py-1">
                        {selectedSlot ? (
                          // Выбранный слот - показываем время и кнопку удаления
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-14 h-14 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex flex-col items-center justify-center"
                                title={`${formatSlotDisplay(selectedSlot)} - Нажмите чтобы удалить`}
                              >
                                <span>{selectedSlot.startHour}:{selectedSlot.startMinute.toString().padStart(2, '0')}</span>
                                <span className="text-[9px] opacity-80">
                                  {selectedSlot.endHour}:{selectedSlot.endMinute.toString().padStart(2, '0')}
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">
                                  {formatSlotDisplay(selectedSlot)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(date, 'd MMMM', { locale: ru })}
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleRemoveSlot(selectedSlot)}
                                >
                                  Удалить
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          // Свободный слот - показываем кнопку выбора
                          <Popover
                            open={isOpen}
                            onOpenChange={(open) => {
                              if (!open) setOpenPopover(null);
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (!disabled) {
                                    setOpenPopover({ dateIndex, hourIndex });
                                  }
                                }}
                                className={cn(
                                  "w-14 h-14 rounded text-xs font-medium transition-colors",
                                  // Полностью занято
                                  fullyOccupied && "bg-red-100 text-red-400 cursor-not-allowed",
                                  // Частично занято
                                  !fullyOccupied && partiallyOccupied && !past && "bg-amber-100 hover:bg-amber-200 text-amber-700 cursor-pointer",
                                  // Свободно
                                  !fullyOccupied && !partiallyOccupied && !past && "bg-green-100 hover:bg-green-200 text-green-700 cursor-pointer",
                                  // Прошедшая дата
                                  past && !fullyOccupied && "bg-muted text-muted-foreground cursor-not-allowed"
                                )}
                                title={
                                  fullyOccupied
                                    ? 'Занято'
                                    : past
                                    ? 'Прошедшая дата'
                                    : partiallyOccupied
                                    ? 'Частично занято - нажмите для выбора доступного времени'
                                    : 'Нажмите чтобы выбрать время'
                                }
                              >
                                {startHour}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <TimeSlotSelector
                                date={date}
                                baseHour={startHour}
                                occupiedIntervals={getIntervalsForDate(date)}
                                existingSlots={selectedSlots}
                                onConfirm={onSlotToggle}
                                onClose={() => setOpenPopover(null)}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
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
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            {selectedSlots
              .sort((a, b) => {
                const dateCompare = a.date.getTime() - b.date.getTime();
                if (dateCompare !== 0) return dateCompare;
                return (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute);
              })
              .map((slot, index) => {
                const durationMinutes = (slot.endHour * 60 + slot.endMinute) - (slot.startHour * 60 + slot.startMinute);
                const hours = Math.floor(durationMinutes / 60);
                const mins = durationMinutes % 60;
                return (
                  <div key={index}>
                    {format(slot.date, 'dd.MM')} {formatSlotDisplay(slot)} ({hours > 0 ? `${hours}ч` : ''}{mins > 0 ? ` ${mins}м` : ''})
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
