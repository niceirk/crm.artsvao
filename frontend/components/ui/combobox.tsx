'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string | undefined, option?: ComboboxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Выберите...',
  searchPlaceholder = 'Поиск...',
  emptyText = 'Не найдено',
  className,
  disabled = false,
  allowEmpty = true,
  emptyLabel = 'Не выбрано',
  searchValue,
  onSearchChange,
  triggerRef,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedValue = value || '';
  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
          ref={triggerRef}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={onSearchChange}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem
                  value="__empty__"
                  onSelect={() => {
                    onValueChange(undefined, undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !selectedValue ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {emptyLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  onSelect={(currentValue) => {
                    const nextValue =
                      currentValue === selectedValue ? undefined : currentValue;
                    onValueChange(
                      nextValue,
                      options.find((opt) => opt.value === nextValue)
                    );
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedValue === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
