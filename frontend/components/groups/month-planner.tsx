'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Settings, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { schedulesApi, type CreateRecurringScheduleDto } from '@/lib/api/schedules';
import { WeeklyScheduleItem, DAY_LABELS, DAYS_OF_WEEK } from '@/lib/types/weekly-schedule';
import { toast } from '@/lib/utils/toast';

interface MonthPlannerProps {
  groupId: string;
  weeklySchedule?: WeeklyScheduleItem[];
  duration?: number;
  teacherId: string;
  roomId?: string;
  onSuccess?: () => void;
}

// Преобразование дней недели из нашего формата в формат API (0=Sunday)
const dayToApiDay = (day: string): number => {
  const mapping: Record<string, number> = {
    'SUN': 0,
    'MON': 1,
    'TUE': 2,
    'WED': 3,
    'THU': 4,
    'FRI': 5,
    'SAT': 6,
  };
  return mapping[day] || 1;
};

export function MonthPlanner({
  groupId,
  weeklySchedule = [],
  duration = 90,
  teacherId,
  roomId,
  onSuccess,
}: MonthPlannerProps) {
  const [loading, setLoading] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Храним расписание для каждого дня: { day: startTime }
  const [customSchedule, setCustomSchedule] = useState<WeeklyScheduleItem[]>([]);
  const [autoEnroll, setAutoEnroll] = useState(true);

  const hasRoomId = Boolean(roomId);
  const hasWeeklySchedule = weeklySchedule && weeklySchedule.length > 0;

  // Инициализация customSchedule из weeklySchedule
  useEffect(() => {
    if (weeklySchedule && weeklySchedule.length > 0) {
      setCustomSchedule([...weeklySchedule]);
    }
  }, [weeklySchedule]);

  // Вычисляем время окончания
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  // Вычисляем даты месяца
  const getMonthDates = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // последний день месяца
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  // Проверяем, включен ли день
  const isDayEnabled = (day: typeof DAYS_OF_WEEK[number]): boolean => {
    return customSchedule.some((item) => item.day === day);
  };

  // Получаем время начала для дня
  const getStartTime = (day: typeof DAYS_OF_WEEK[number]): string => {
    const item = customSchedule.find((item) => item.day === day);
    return item?.startTime || '09:00';
  };

  // Переключение дня
  const toggleDay = (day: typeof DAYS_OF_WEEK[number]) => {
    if (isDayEnabled(day)) {
      // Убираем день
      setCustomSchedule(customSchedule.filter((item) => item.day !== day));
    } else {
      // Добавляем день с временем по умолчанию
      setCustomSchedule([...customSchedule, { day, startTime: '09:00' }]);
    }
  };

  // Изменение времени для дня
  const updateStartTime = (day: typeof DAYS_OF_WEEK[number], startTime: string) => {
    setCustomSchedule(
      customSchedule.map((item) => (item.day === day ? { ...item, startTime } : item))
    );
  };

  // Навигация по месяцам
  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1); // month-2 потому что месяцы с 0
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1); // month потому что месяцы с 0
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const handleCreateSchedule = async () => {
    // Определяем какое расписание использовать
    const scheduleToUse = isCustomMode ? customSchedule : weeklySchedule;

    console.log('=== MonthPlanner: handleCreateSchedule ===');
    console.log('isCustomMode:', isCustomMode);
    console.log('weeklySchedule:', weeklySchedule);
    console.log('customSchedule:', customSchedule);
    console.log('scheduleToUse:', scheduleToUse);

    if (!scheduleToUse || scheduleToUse.length === 0) {
      toast.error('Выберите хотя бы один день недели');
      return;
    }

    if (!roomId) {
      toast.error('Не указано помещение для группы');
      return;
    }

    try {
      setLoading(true);

      const { startDate, endDate } = getMonthDates();
      console.log('Month dates:', { startDate, endDate });

      // Группируем дни по времени для оптимизации запросов
      const timeGroups = new Map<string, typeof DAYS_OF_WEEK[number][]>();

      scheduleToUse.forEach((item) => {
        const timeKey = item.startTime;
        if (!timeGroups.has(timeKey)) {
          timeGroups.set(timeKey, []);
        }
        timeGroups.get(timeKey)!.push(item.day);
      });

      console.log('Time groups:', Array.from(timeGroups.entries()));

      // Создаем расписание для каждой группы времени
      let totalCreated = 0;
      let totalSkipped = 0;

      for (const [startTime, days] of timeGroups) {
        const endTime = calculateEndTime(startTime, duration);
        const daysOfWeek = days.map(dayToApiDay);

        const data: CreateRecurringScheduleDto = {
          groupId,
          teacherId,
          roomId,
          type: 'GROUP_CLASS',
          recurrenceRule: {
            daysOfWeek,
            startDate,
            endDate,
            time: {
              start: startTime,
              end: endTime,
            },
          },
          autoEnrollClients: autoEnroll,
        };

        console.log('Creating schedule with data:', JSON.stringify(data, null, 2));

        const result = await schedulesApi.createRecurring(data);
        console.log('API result:', result);
        console.log('Created count:', result.created?.count);
        console.log('Created schedule array length:', result.created?.schedule?.length);
        console.log('Skipped count:', result.skipped?.count);

        // Правильная обработка структуры ответа: { created: { count, schedule }, skipped: { count, conflicts } }
        const createdCount = result.created?.count || 0;
        const skippedCount = result.skipped?.count || 0;

        console.log(`This request: created=${createdCount}, skipped=${skippedCount}`);
        console.log(`Before adding: totalCreated=${totalCreated}, totalSkipped=${totalSkipped}`);

        totalCreated += createdCount;
        totalSkipped += skippedCount;

        console.log(`After adding: totalCreated=${totalCreated}, totalSkipped=${totalSkipped}`);
      }

      console.log('Total created:', totalCreated, 'Total skipped:', totalSkipped);

      if (totalCreated > 0) {
        toast.success(
          `Создано ${totalCreated} занятий` +
          (totalSkipped > 0 ? `, пропущено ${totalSkipped} (конфликты)` : '')
        );
        onSuccess?.();
      } else {
        toast.warning('Не удалось создать ни одного занятия. Возможно, все даты заняты.');
      }
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Не удалось создать расписание';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Компактный режим показываем только если есть базовый паттерн И не включен режим настройки
  const showCompactMode = hasWeeklySchedule && !isCustomMode;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Планирование расписания</CardTitle>
            <CardDescription>
              {showCompactMode
                ? 'Создайте занятия на месяц по базовому паттерну'
                : 'Настройте дни и время для создания расписания'}
            </CardDescription>
          </div>
          {hasWeeklySchedule && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomMode(!isCustomMode)}
            >
              {isCustomMode ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Свернуть
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Настроить
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Предупреждение о необходимости помещения */}
        {!hasRoomId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">
              Внимание: Для создания расписания необходимо указать помещение для группы
            </p>
            <p className="text-sm text-amber-600 mt-1">
              Нажмите "Редактировать" вверху страницы и выберите помещение
            </p>
          </div>
        )}

        {showCompactMode ? (
          /* КОМПАКТНЫЙ РЕЖИМ */
          <>
            {/* Выбор месяца */}
            <div className="space-y-2">
              <Label>Месяц</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[150px]">
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-center"
                  />
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Информация о базовом паттерне */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <p className="text-sm font-medium">Базовый паттерн расписания:</p>

              {/* Компактное отображение расписания */}
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const scheduleItem = weeklySchedule.find((item) => item.day === day);
                  const enabled = Boolean(scheduleItem);

                  return (
                    <div
                      key={day}
                      className={`flex flex-col items-center gap-1 p-2 border rounded-lg ${
                        enabled ? 'bg-background' : 'bg-muted/30'
                      }`}
                    >
                      <div className="text-xs font-medium uppercase text-muted-foreground">
                        {DAY_LABELS[day]}
                      </div>
                      {enabled ? (
                        <div className="text-sm font-semibold tabular-nums">
                          {scheduleItem.startTime}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {duration > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Длительность занятия: {duration} мин
                </p>
              )}
            </div>

            {/* Автозапись участников */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoEnroll"
                checked={autoEnroll}
                onCheckedChange={(checked) => setAutoEnroll(checked as boolean)}
              />
              <Label htmlFor="autoEnroll" className="cursor-pointer font-normal text-sm">
                Автоматически записать участников группы
              </Label>
            </div>

            {/* Кнопка создания */}
            <Button
              onClick={handleCreateSchedule}
              disabled={loading || !hasRoomId}
              className="w-full"
              size="lg"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {loading ? 'Создание...' : 'Создать расписание на месяц'}
            </Button>
          </>
        ) : (
          /* РЕЖИМ НАСТРОЙКИ */
          <>
            {/* Выбор месяца */}
            <div className="space-y-2">
              <Label>Месяц</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[150px]">
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-center"
                  />
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Горизонтальная сетка дней недели с временем */}
            <div className="space-y-3">
              <Label>Расписание по дням недели</Label>
              <div className="grid grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map((day) => {
                  const enabled = isDayEnabled(day);
                  const startTime = getStartTime(day);
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

                      {/* Время */}
                      {enabled ? (
                        <div className="flex flex-col items-center gap-2 w-full">
                          <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => updateStartTime(day, e.target.value)}
                            className="w-full text-center text-sm"
                          />
                          {endTime && (
                            <Badge variant="outline" className="text-xs w-full justify-center tabular-nums">
                              {endTime}
                            </Badge>
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
            </div>

            {/* Автозапись участников */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoEnroll-custom"
                checked={autoEnroll}
                onCheckedChange={(checked) => setAutoEnroll(checked as boolean)}
              />
              <Label htmlFor="autoEnroll-custom" className="cursor-pointer font-normal text-sm">
                Автоматически записать участников группы
              </Label>
            </div>

            {/* Информация о создаваемом расписании */}
            {customSchedule.length > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <p className="font-medium">Будет создано расписание:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Месяц: {new Date(selectedMonth + '-01').toLocaleDateString('ru-RU', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </li>
                  <li>
                    Дни: {customSchedule.map((item) => DAY_LABELS[item.day]).join(', ')}
                  </li>
                  {autoEnroll && (
                    <li>Участники группы будут автоматически записаны</li>
                  )}
                </ul>
              </div>
            )}

            {/* Кнопка создания */}
            <Button
              onClick={handleCreateSchedule}
              disabled={loading || customSchedule.length === 0 || !hasRoomId}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {loading ? 'Создание...' : 'Создать расписание на месяц'}
            </Button>

            {customSchedule.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Выберите хотя бы один день недели для создания расписания
              </p>
            )}
          </>
        )}

        {!hasRoomId && (
          <p className="text-sm text-amber-600 text-center font-medium">
            Сначала укажите помещение для группы
          </p>
        )}
      </CardContent>
    </Card>
  );
}
