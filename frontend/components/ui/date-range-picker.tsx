'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRangePickerProps {
  value?: { from?: string; to?: string };
  onChange?: (range: { from?: string; to?: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Выберите период',
  disabled = false,
  className,
  minDate,
  maxDate = new Date(2030, 11, 31),
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Преобразование строк в Date
  const dateRange: DateRange | undefined = React.useMemo(() => {
    if (!value?.from && !value?.to) return undefined;
    return {
      from: value?.from ? parseDate(value.from) : undefined,
      to: value?.to ? parseDate(value.to) : undefined,
    };
  }, [value]);

  function parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const handleSelect = (range: DateRange | undefined) => {
    onChange?.({
      from: range?.from ? formatDateToString(range.from) : undefined,
      to: range?.to ? formatDateToString(range.to) : undefined,
    });
  };

  const displayValue = React.useMemo(() => {
    if (!dateRange?.from) return null;
    if (!dateRange.to) {
      return format(dateRange.from, 'dd.MM.yyyy', { locale: ru });
    }
    return `${format(dateRange.from, 'dd.MM.yyyy', { locale: ru })} – ${format(dateRange.to, 'dd.MM.yyyy', { locale: ru })}`;
  }, [dateRange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal',
            !displayValue && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          locale={ru}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
