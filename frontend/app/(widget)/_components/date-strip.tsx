'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateStripProps {
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  datesWithEvents: string[];
}

function getDayName(date: Date): string {
  const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
  return days[date.getDay()];
}

function getMonthName(date: Date): string {
  const months = [
    'ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
    'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'
  ];
  return months[date.getMonth()];
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateDates(days: number = 21): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }

  return dates;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

interface DateGroup {
  month: string;
  dates: Date[];
}

function groupDatesByMonth(dates: Date[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let currentMonth = '';
  let currentGroup: Date[] = [];

  dates.forEach((date) => {
    const month = getMonthName(date);
    if (month !== currentMonth) {
      if (currentGroup.length > 0) {
        groups.push({ month: currentMonth, dates: currentGroup });
      }
      currentMonth = month;
      currentGroup = [date];
    } else {
      currentGroup.push(date);
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ month: currentMonth, dates: currentGroup });
  }

  return groups;
}

export function DateStrip({ selectedDate, onSelectDate, datesWithEvents }: DateStripProps) {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const dates = generateDates(60); // Генерируем на 2 месяца вперед
  const dateGroups = groupDatesByMonth(dates);
  const datesSet = new Set(datesWithEvents);

  const currentGroup = dateGroups[currentMonthIndex];
  const hasPrevMonth = currentMonthIndex > 0;
  const hasNextMonth = currentMonthIndex < dateGroups.length - 1;

  const goToPrevMonth = () => {
    if (hasPrevMonth) {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
  };

  const goToNextMonth = () => {
    if (hasNextMonth) {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
  };

  if (!currentGroup) return null;

  return (
    <div className="mb-2">
      {/* Заголовок месяца со стрелками */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={goToPrevMonth}
          disabled={!hasPrevMonth}
          className={cn(
            'p-1 rounded transition-colors',
            hasPrevMonth
              ? 'hover:bg-muted text-foreground'
              : 'text-muted-foreground/30 cursor-not-allowed'
          )}
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-xs text-muted-foreground uppercase tracking-wider min-w-[80px] text-center">
          {currentGroup.month}
        </p>
        <button
          onClick={goToNextMonth}
          disabled={!hasNextMonth}
          className={cn(
            'p-1 rounded transition-colors',
            hasNextMonth
              ? 'hover:bg-muted text-foreground'
              : 'text-muted-foreground/30 cursor-not-allowed'
          )}
          aria-label="Следующий месяц"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Даты текущего месяца */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3">
          {currentGroup.dates.map((date) => {
            const dateKey = formatDateKey(date);
            const isSelected = selectedDate === dateKey;
            const weekend = isWeekend(date);
            const hasEvents = datesSet.has(dateKey);

            return (
              <button
                key={dateKey}
                onClick={() => onSelectDate(isSelected ? null : dateKey)}
                className={cn(
                  'flex flex-col items-center min-w-[40px] px-2 py-2 rounded-lg transition-all',
                  isSelected && 'bg-primary text-primary-foreground',
                  !hasEvents && !isSelected && 'opacity-40',
                )}
                disabled={!hasEvents}
              >
                <span className={cn(
                  'text-xl font-semibold mb-0.5',
                  isSelected
                    ? 'text-primary-foreground'
                    : hasEvents
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}>
                  {date.getDate()}
                </span>
                <span
                  className={cn(
                    'text-xs uppercase',
                    isSelected
                      ? 'text-primary-foreground'
                      : !hasEvents
                        ? 'text-muted-foreground'
                        : weekend
                          ? 'text-orange-500'
                          : 'text-muted-foreground'
                  )}
                >
                  {getDayName(date)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
