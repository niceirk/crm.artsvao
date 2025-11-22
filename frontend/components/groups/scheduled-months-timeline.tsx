'use client';

import { useEffect, useState } from 'react';
import { groupsApi, ScheduledMonth } from '@/lib/api/groups';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from 'lucide-react';

interface ScheduledMonthsTimelineProps {
  groupId: string;
  onMonthClick?: (yearMonth: string) => void;
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export function ScheduledMonthsTimeline({ groupId, onMonthClick }: ScheduledMonthsTimelineProps) {
  const [scheduledMonths, setScheduledMonths] = useState<ScheduledMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScheduledMonths();
  }, [groupId]);

  const loadScheduledMonths = async () => {
    try {
      setLoading(true);
      const data = await groupsApi.getScheduledMonths(groupId);
      setScheduledMonths(data);
    } catch (error) {
      console.error('Ошибка загрузки запланированных месяцев:', error);
    } finally {
      setLoading(false);
    }
  };

  // Генерируем массив месяцев: охватываем все запланированные месяцы + буфер
  const generateMonthsRange = () => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); // По умолчанию 3 месяца назад
    let endDate = new Date(now.getFullYear(), now.getMonth() + 6, 1); // По умолчанию 6 месяцев вперед

    // Если есть запланированные месяцы, расширяем диапазон
    if (scheduledMonths.length > 0) {
      const firstScheduled = new Date(scheduledMonths[0].yearMonth + '-01');
      const lastScheduled = new Date(scheduledMonths[scheduledMonths.length - 1].yearMonth + '-01');

      // Начинаем с 2 месяцев до первого запланированного (но не ранее 3 месяцев назад от текущего)
      const minStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const calculatedStart = new Date(firstScheduled.getFullYear(), firstScheduled.getMonth() - 2, 1);
      startDate = calculatedStart < minStart ? minStart : calculatedStart;

      // Заканчиваем через 3 месяца после последнего запланированного (но не менее 6 месяцев от текущего)
      const minEnd = new Date(now.getFullYear(), now.getMonth() + 6, 1);
      const calculatedEnd = new Date(lastScheduled.getFullYear(), lastScheduled.getMonth() + 3, 1);
      endDate = calculatedEnd > minEnd ? calculatedEnd : minEnd;
    }

    const months = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const yearMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        yearMonth,
        isCurrent: yearMonth === currentYearMonth,
        isPast: yearMonth < currentYearMonth,
        isFuture: yearMonth > currentYearMonth,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  const monthsRange = generateMonthsRange();

  // Создаем карту для быстрого поиска запланированных месяцев
  const scheduledMap = new Map(
    scheduledMonths.map(sm => [sm.yearMonth, sm])
  );

  if (loading) {
    return (
      <div className="py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Запланированные месяцы</span>
        </div>
        {scheduledMonths.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {scheduledMonths.length} {scheduledMonths.length === 1 ? 'месяц' : scheduledMonths.length < 5 ? 'месяца' : 'месяцев'} с расписанием
          </div>
        )}
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-4">
          {monthsRange.map((month) => {
            const scheduled = scheduledMap.get(month.yearMonth);
            const hasSchedule = !!scheduled;

            return (
              <div
                key={month.yearMonth}
                onClick={() => !hasSchedule && onMonthClick?.(month.yearMonth)}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border min-w-[100px]
                  ${month.isCurrent ? 'border-primary bg-primary/5' : 'border-border'}
                  ${hasSchedule ? 'bg-green-50/50 dark:bg-green-950/10' : 'bg-muted/30'}
                  ${!hasSchedule && onMonthClick ? 'cursor-pointer hover:bg-accent hover:border-primary transition-colors' : ''}
                `}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {MONTHS_RU[month.month - 1]}
                </div>
                <div className="text-lg font-semibold">
                  {month.year}
                </div>

                {hasSchedule ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    {scheduled.count} {scheduled.count === 1 ? 'занятие' : 'занятий'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Не запланировано
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {scheduledMonths.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Расписание пока не создано ни для одного месяца
        </p>
      )}
    </div>
  );
}
