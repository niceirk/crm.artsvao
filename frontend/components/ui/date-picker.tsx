'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import InputMask from 'react-input-mask';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'ДД.ММ.ГГГГ',
  disabled = false,
  className,
  minDate = new Date('1900-01-01'),
  maxDate = new Date(),
  fromYear = 1900,
  toYear = new Date().getFullYear(),
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // Правильное преобразование строки даты в объект Date (без проблем с временными зонами)
  const dateValue = value ? (() => {
    // Если value это Date, конвертируем в строку
    let dateStr = typeof value === 'string' ? value : value.toISOString();

    // Убираем время, если оно есть (для ISO формата 2000-01-15T00:00:00.000Z)
    dateStr = dateStr.split('T')[0];

    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  })() : undefined;

  // Преобразование Date в строку формата YYYY-MM-DD в локальной временной зоне
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Преобразование даты в формат ДД.ММ.ГГГГ для отображения
  const formatDateForInput = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Парсинг даты из формата ДД.ММ.ГГГГ
  const parseDateFromInput = (inputStr: string): Date | null => {
    if (!inputStr || inputStr.includes('_')) return null;
    
    try {
      const cleanInput = inputStr.replace(/[.\-\/]/g, '.');
      const parsedDate = parse(cleanInput, 'dd.MM.yyyy', new Date());
      
      if (!isValid(parsedDate)) return null;
      if (parsedDate < minDate || parsedDate > maxDate) return null;
      
      return parsedDate;
    } catch {
      return null;
    }
  };

  // Синхронизация inputValue с value
  React.useEffect(() => {
    if (dateValue) {
      setInputValue(formatDateForInput(dateValue));
    } else {
      setInputValue('');
    }
  }, [dateValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const parsedDate = parseDateFromInput(newValue);
    if (parsedDate) {
      onChange?.(formatDateToString(parsedDate));
    } else if (!newValue || newValue.includes('_')) {
      onChange?.(null);
    }
  };

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date ? formatDateToString(date) : null);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      {/* @ts-expect-error - react-input-mask types incompatible with React 19 */}
      <InputMask
        mask="99.99.9999"
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder={placeholder}
      >
        {(inputProps: any) => (
          <input
            {...inputProps}
            type="text"
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-10 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
            )}
          />
        )}
      </InputMask>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0 h-4 w-4 opacity-50 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            disabled={(date) => date > maxDate || date < minDate}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
            locale={ru}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
