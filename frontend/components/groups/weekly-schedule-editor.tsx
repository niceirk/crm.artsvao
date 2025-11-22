'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Save, Edit, X } from 'lucide-react';
import { WeeklyScheduleItem, DAYS_OF_WEEK, DAY_LABELS } from '@/lib/types/weekly-schedule';

interface Room {
  id: string;
  name: string;
  number?: string;
}

interface WeeklyScheduleEditorProps {
  value: WeeklyScheduleItem[];
  duration?: number; // Длительность занятия в минутах
  onChange: (schedule: WeeklyScheduleItem[]) => void;
  onSave?: () => Promise<void>;
  rooms?: Room[]; // Список доступных помещений
  defaultRoomId?: string; // Помещение группы по умолчанию
}

export function WeeklyScheduleEditor({
  value,
  duration = 0,
  onChange,
  onSave,
  rooms = [],
  defaultRoomId,
}: WeeklyScheduleEditorProps) {
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Вычисляем время окончания
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!durationMinutes) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  // Проверяем, включен ли день
  const isDayEnabled = (day: typeof DAYS_OF_WEEK[number]): boolean => {
    return value.some((item) => item.day === day);
  };

  // Получаем время начала для дня
  const getStartTime = (day: typeof DAYS_OF_WEEK[number]): string => {
    const item = value.find((item) => item.day === day);
    return item?.startTime || '09:00';
  };

  // Получаем roomId для дня
  const getRoomId = (day: typeof DAYS_OF_WEEK[number]): string | undefined => {
    const item = value.find((item) => item.day === day);
    return item?.roomId;
  };

  // Получаем объект Room по ID
  const getRoomById = (roomId?: string): Room | undefined => {
    if (!roomId) return undefined;
    return rooms.find(r => r.id === roomId);
  };

  // Форматируем название помещения
  const formatRoomName = (room?: Room): string => {
    if (!room) return '';
    return room.number ? `${room.name} (${room.number})` : room.name;
  };

  // Переключение дня
  const toggleDay = (day: typeof DAYS_OF_WEEK[number]) => {
    if (isDayEnabled(day)) {
      // Убираем день
      onChange(value.filter((item) => item.day !== day));
    } else {
      // Добавляем день с временем по умолчанию и помещением группы
      onChange([...value, { day, startTime: '09:00', roomId: defaultRoomId }]);
    }
  };

  // Изменение времени
  const updateStartTime = (day: typeof DAYS_OF_WEEK[number], startTime: string) => {
    onChange(
      value.map((item) => (item.day === day ? { ...item, startTime } : item))
    );
  };

  // Изменение помещения
  const updateRoomId = (day: typeof DAYS_OF_WEEK[number], roomId: string | undefined) => {
    onChange(
      value.map((item) => (item.day === day ? { ...item, roomId } : item))
    );
  };

  // Сохранение
  const handleSave = async () => {
    if (!onSave) return;

    try {
      setSaving(true);
      await onSave();
      setIsEditing(false); // Закрываем режим редактирования после сохранения
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Расписание группы</CardTitle>
            <CardDescription>
              {isEditing
                ? 'Настройте недельный шаблон занятий. Дни недели и время начала.'
                : 'Недельный шаблон занятий группы'
              }
            </CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          // Режим редактирования
          <>
            {/* Сетка дней недели */}
            <div className="grid grid-cols-7 gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const enabled = isDayEnabled(day);
                const startTime = getStartTime(day);
                const roomId = getRoomId(day);
                const endTime = duration ? calculateEndTime(startTime, duration) : '';

                return (
                  <div
                    key={day}
                    className="flex flex-col items-center gap-3 p-3 border rounded-lg"
                  >
                    {/* День недели */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={enabled}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <Label
                        htmlFor={`day-${day}`}
                        className="font-medium cursor-pointer text-sm"
                      >
                        {DAY_LABELS[day]}
                      </Label>
                    </div>

                    {/* Время и помещение */}
                    {enabled ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => updateStartTime(day, e.target.value)}
                          className="w-full text-center"
                        />
                        {endTime && (
                          <Badge variant="outline" className="font-mono text-xs w-full justify-center">
                            {endTime}
                          </Badge>
                        )}

                        {/* Селектор помещения */}
                        {rooms.length > 0 && (
                          <Combobox
                            options={rooms.map((room) => ({
                              value: room.id,
                              label: formatRoomName(room),
                            }))}
                            value={roomId}
                            onValueChange={(value) => updateRoomId(day, value)}
                            placeholder="Помещение"
                            searchPlaceholder="Поиск помещения..."
                            emptyText="Помещение не найдено"
                            className="w-full h-8 text-xs"
                            allowEmpty={true}
                            emptyLabel="Не выбрано"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Подсказка о длительности */}
            {duration > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Длительность занятия: {duration} мин
              </div>
            )}

            {/* Кнопки сохранения и отмены */}
            <div className="flex gap-2 pt-2">
              {onSave && (
                <Button
                  onClick={handleSave}
                  disabled={saving || value.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Отмена
              </Button>
            </div>

            {value.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Выберите хотя бы один день недели для занятий
              </p>
            )}
          </>
        ) : (
          // Режим просмотра
          <>
            {value.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Расписание не настроено
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Нажмите "Редактировать" для настройки расписания
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const enabled = isDayEnabled(day);
                  const startTime = getStartTime(day);
                  const roomId = getRoomId(day);
                  const room = getRoomById(roomId);
                  const endTime = duration ? calculateEndTime(startTime, duration) : '';

                  return (
                    <div
                      key={day}
                      className={`flex flex-col items-center gap-1.5 p-2.5 border rounded-lg ${
                        enabled ? 'bg-primary/5' : 'bg-muted/30'
                      }`}
                    >
                      {/* День недели */}
                      <div className="text-xs font-medium uppercase">
                        {DAY_LABELS[day]}
                      </div>

                      {/* Время */}
                      {enabled ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="text-base font-semibold tabular-nums">
                            {startTime}
                          </div>
                          {endTime && (
                            <div className="text-sm text-muted-foreground tabular-nums">
                              {endTime}
                            </div>
                          )}
                          {/* Помещение */}
                          {room && (
                            <div className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                              {formatRoomName(room)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {duration > 0 && value.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Длительность занятия: {duration} мин
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
