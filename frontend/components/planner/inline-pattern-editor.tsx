'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Edit2, Check, X } from 'lucide-react';
import { WeeklyScheduleItem, DAYS_OF_WEEK, DAY_LABELS, calculateEndTime, formatWeeklySchedule } from '@/lib/types/weekly-schedule';

interface Room {
  id: string;
  name: string;
  number?: string;
}

interface InlinePatternEditorProps {
  value: WeeklyScheduleItem[];
  originalValue: WeeklyScheduleItem[];
  onChange: (pattern: WeeklyScheduleItem[]) => void;
  duration: number;
  rooms: Room[];
  isModified?: boolean;
}

export function InlinePatternEditor({
  value,
  originalValue,
  onChange,
  duration,
  rooms,
  isModified = false,
}: InlinePatternEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState<WeeklyScheduleItem[]>(value);

  // Обновляем localValue когда value меняется извне
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalValue(value);
    }
    setIsOpen(open);
  };

  const formatRoomName = (room?: Room): string => {
    if (!room) return '';
    return room.number ? `${room.name} (${room.number})` : room.name;
  };

  const isDayEnabled = (day: typeof DAYS_OF_WEEK[number]): boolean => {
    return localValue.some((item) => item.day === day);
  };

  const getStartTime = (day: typeof DAYS_OF_WEEK[number]): string => {
    const item = localValue.find((item) => item.day === day);
    return item?.startTime || '09:00';
  };

  const getRoomId = (day: typeof DAYS_OF_WEEK[number]): string | undefined => {
    const item = localValue.find((item) => item.day === day);
    return item?.roomId;
  };

  const toggleDay = (day: typeof DAYS_OF_WEEK[number]) => {
    if (isDayEnabled(day)) {
      setLocalValue(localValue.filter((item) => item.day !== day));
    } else {
      setLocalValue([...localValue, { day, startTime: '09:00' }]);
    }
  };

  const updateStartTime = (day: typeof DAYS_OF_WEEK[number], startTime: string) => {
    setLocalValue(
      localValue.map((item) => (item.day === day ? { ...item, startTime } : item))
    );
  };

  const updateRoomId = (day: typeof DAYS_OF_WEEK[number], roomId: string | undefined) => {
    setLocalValue(
      localValue.map((item) => (item.day === day ? { ...item, roomId } : item))
    );
  };

  const handleSave = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsOpen(false);
  };

  // Форматируем отображение паттерна
  const displayText = formatWeeklySchedule(value, duration);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`h-auto py-1 px-2 font-normal justify-start ${
            isModified ? 'text-blue-600 dark:text-blue-400' : ''
          }`}
        >
          <span className="truncate max-w-[200px]">{displayText}</span>
          {isModified && (
            <Badge variant="secondary" className="ml-2 text-xs">
              изменено
            </Badge>
          )}
          <Edit2 className="h-3 w-3 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4 max-w-[95vw] overflow-auto"
        align="start"
        collisionPadding={16}
        side="bottom"
        sideOffset={4}
      >
        <div className="space-y-4">
          <div className="text-sm font-medium">Редактирование расписания</div>

          {/* Сетка дней недели */}
          <div className="grid grid-cols-7 gap-2 min-w-max">
            {DAYS_OF_WEEK.map((day) => {
              const enabled = isDayEnabled(day);
              const startTime = getStartTime(day);
              const roomId = getRoomId(day);
              const endTime = duration ? calculateEndTime(startTime, duration) : '';

              return (
                <div
                  key={day}
                  className="flex flex-col items-center gap-2 p-2 border rounded-lg min-w-[70px]"
                >
                  {/* День недели */}
                  <div className="flex items-center gap-1">
                    <Checkbox
                      id={`edit-day-${day}`}
                      checked={enabled}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label
                      htmlFor={`edit-day-${day}`}
                      className="font-medium cursor-pointer text-xs"
                    >
                      {DAY_LABELS[day]}
                    </Label>
                  </div>

                  {/* Время */}
                  {enabled ? (
                    <div className="flex flex-col items-center gap-1 w-full">
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => updateStartTime(day, e.target.value)}
                        className="w-full text-center text-xs h-7"
                      />
                      {endTime && (
                        <Badge variant="outline" className="text-[10px] w-full justify-center">
                          {endTime}
                        </Badge>
                      )}
                      {rooms.length > 0 && (
                        <Combobox
                          options={rooms.map((room) => ({
                            value: room.id,
                            label: formatRoomName(room),
                          }))}
                          value={roomId}
                          onValueChange={(value) => updateRoomId(day, value)}
                          placeholder="Зал"
                          className="w-full h-6 text-[10px]"
                          allowEmpty={true}
                          emptyLabel="—"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Длительность */}
          {duration > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Длительность: {duration} мин
            </div>
          )}

          {/* Кнопки */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Отмена
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3 w-3 mr-1" />
              Применить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
