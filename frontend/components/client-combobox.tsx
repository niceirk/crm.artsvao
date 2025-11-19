'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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
import type { Client } from '@/lib/types/clients';
import { useSearchClients } from '@/hooks/useClients';

interface ClientComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function ClientCombobox({
  value,
  onValueChange,
  placeholder = 'Выберите клиента',
  emptyMessage = 'Клиент не найден',
  disabled = false,
}: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedClientData, setSelectedClientData] = React.useState<Client | null>(null);

  // Используем серверный поиск с debounce
  const { data: searchResults, isLoading } = useSearchClients(searchQuery, 300);

  const getClientLabel = (client: Client) => {
    return `${client.lastName} ${client.firstName}${
      client.middleName ? ` ${client.middleName}` : ''
    } (${client.phone})`;
  };

  // Запоминаем выбранного клиента для отображения
  React.useEffect(() => {
    if (value && searchResults) {
      const client = searchResults.find((c) => c.id === value);
      if (client) {
        setSelectedClientData(client);
      }
    }
  }, [value, searchResults]);

  const displayClients = searchResults || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedClientData ? getClientLabel(selectedClientData) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Начните вводить имя, телефон или email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayClients.length === 0 ? (
              <CommandEmpty>
                {searchQuery.length < 2
                  ? 'Введите минимум 2 символа для поиска'
                  : emptyMessage}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {displayClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? '' : currentValue);
                      setSelectedClientData(client);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === client.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {client.lastName} {client.firstName}
                        {client.middleName && ` ${client.middleName}`}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {client.phone}
                        {client.email && ` • ${client.email}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
