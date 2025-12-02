'use client';

import { useEffect, useMemo } from 'react';
import { format, isSameDay, isBefore, startOfDay, isWeekend } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConflictInfo } from '@/lib/types/rental-applications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface RoomDailyAvailabilityGridProps {
  roomId: string;
  selectedDates: Date[];
  conflicts: ConflictInfo[];
  isCheckingAvailability: boolean;
  ignoreConflicts: boolean;
  onIgnoreConflictsChange: (value: boolean) => void;
  onCheckAvailability: () => void;
}

export function RoomDailyAvailabilityGrid({
  roomId,
  selectedDates,
  conflicts,
  isCheckingAvailability,
  ignoreConflicts,
  onIgnoreConflictsChange,
  onCheckAvailability,
}: RoomDailyAvailabilityGridProps) {
  // Автоматическая проверка доступности при изменении выбранных дат
  useEffect(() => {
    if (selectedDates.length > 0 && roomId) {
      onCheckAvailability();
    }
  }, [selectedDates.length, roomId]);

  // Группируем конфликты по датам
  const conflictsByDate = useMemo(() => {
    const map = new Map<string, ConflictInfo[]>();
    conflicts.forEach((conflict) => {
      const dateStr = format(new Date(conflict.date), 'yyyy-MM-dd');
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(conflict);
    });
    return map;
  }, [conflicts]);

  // Проверка, есть ли конфликт для даты
  const hasConflict = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return conflictsByDate.has(dateStr);
  };

  // Получить конфликты для даты
  const getConflictsForDate = (date: Date): ConflictInfo[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return conflictsByDate.get(dateStr) || [];
  };

  // Проверка: прошедшая ли дата
  const isPastDate = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date()));
  };

  if (selectedDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-muted-foreground border rounded-md border-dashed">
        Выберите дни в календаре
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок с индикатором загрузки */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Статус доступности</h4>
        {isCheckingAvailability && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>Проверка...</span>
          </div>
        )}
      </div>

      {/* Сетка с днями */}
      <div className="space-y-2 border rounded-lg p-4">
        {selectedDates
          .sort((a, b) => a.getTime() - b.getTime())
          .map((date) => {
            const dateConflicts = getConflictsForDate(date);
            const hasConflicts = dateConflicts.length > 0;
            const past = isPastDate(date);

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  hasConflicts && "bg-red-50 border-red-200",
                  !hasConflicts && !past && "bg-green-50 border-green-200",
                  past && "bg-muted border-muted"
                )}
              >
                {/* Иконка статуса */}
                <div className="flex-shrink-0 mt-0.5">
                  {hasConflicts ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : past ? (
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>

                {/* Информация о дне */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        isWeekend(date) && "text-red-600"
                      )}
                    >
                      {format(date, 'dd MMMM yyyy (EEEE)', { locale: ru })}
                    </span>
                    {past && (
                      <span className="text-xs text-muted-foreground">
                        (прошедшая дата)
                      </span>
                    )}
                  </div>

                  {/* Статус */}
                  {!past && (
                    <div className="text-sm mt-1">
                      {hasConflicts ? (
                        <span className="text-red-600 font-medium">
                          Обнаружен конфликт
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          Доступно
                        </span>
                      )}
                    </div>
                  )}

                  {/* Конфликты */}
                  {dateConflicts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {dateConflicts.map((conflict, idx) => (
                        <div key={idx} className="text-xs text-red-600">
                          {conflict.startTime && conflict.endTime
                            ? `${conflict.startTime} - ${conflict.endTime}: ${conflict.description}`
                            : conflict.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Общий блок с конфликтами */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Обнаружены конфликты</AlertTitle>
          <AlertDescription>
            <div className="mt-2 text-sm">
              Выбранные дни имеют конфликты с существующими бронированиями.
              Вы можете игнорировать конфликты и продолжить создание заявки.
            </div>
            <div className="mt-3">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={ignoreConflicts}
                  onCheckedChange={(checked) => onIgnoreConflictsChange(!!checked)}
                />
                <span>Игнорировать конфликты и продолжить</span>
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Легенда */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Доступно</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-4 w-4 text-red-500" />
          <span>Конфликт</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span>Прошедшая дата</span>
        </div>
      </div>

      {/* Итого */}
      {selectedDates.length > 0 && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-sm font-medium">
            Выбрано дней: {selectedDates.length}
          </div>
          {conflicts.length > 0 && (
            <div className="text-xs text-red-600 mt-1">
              Конфликтов: {conflicts.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
