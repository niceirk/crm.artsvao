'use client';

import * as React from 'react';
import { Check, X, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Выберите элементы...',
  emptyText = 'Ничего не найдено',
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedOptions = options.filter((option) =>
    selected.includes(option.value)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-auto min-h-10', className)}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap items-center flex-1 min-w-0">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selectedOptions.slice(0, 2).map((option) => (
              <Badge
                variant="secondary"
                key={option.value}
                className="mr-1 flex items-center gap-1"
              >
                <span className="truncate max-w-[150px]">{option.label}</span>
                <X
                  className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnselect(option.value);
                  }}
                />
              </Badge>
            ))}
            {selected.length > 2 && (
              <Badge variant="secondary" className="mr-1">
                +{selected.length - 2} ещё
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selected.includes(option.value)
                        ? 'opacity-100'
                        : 'opacity-0'
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
