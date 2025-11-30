'use client';

import * as React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiClient } from '@/lib/api/client';
import type { Client, ClientStatus } from '@/lib/types/clients';

// Вычисление возраста
function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Форматирование возраста с правильным склонением
function formatAge(age: number): string {
  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${age} лет`;
  if (lastDigit === 1) return `${age} год`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${age} года`;
  return `${age} лет`;
}

// Конфигурация статусов
const statusConfig: Record<ClientStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Активный', variant: 'success' },
  INACTIVE: { label: 'Неактивный', variant: 'secondary' },
  VIP: { label: 'VIP', variant: 'default' },
};

// Форматирование телефона
function formatPhone(phone: string): string {
  if (!phone) return '';
  // Убираем все нецифровые символы
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }
  return phone;
}

// Получить полное ФИО
function getFullName(client: Client): string {
  const parts = [client.lastName, client.firstName];
  if (client.middleName) {
    parts.push(client.middleName);
  }
  return parts.join(' ');
}

export interface ClientSearchProps {
  value?: string;
  onValueChange: (clientId: string | undefined) => void;
  onClientSelect?: (client: Client | null) => void;
  disabled?: boolean;
  placeholder?: string;
  showCreateButton?: boolean;
  className?: string;
  excludeClientId?: string;
}

export function ClientSearch({
  value,
  onValueChange,
  onClientSelect,
  disabled = false,
  placeholder = 'Поиск клиента...',
  showCreateButton = true,
  className,
  excludeClientId,
}: ClientSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Загрузка клиентов
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        const searchParam = debouncedSearch
          ? `&search=${encodeURIComponent(debouncedSearch)}`
          : '';
        const response = await apiClient.get<{ data: Client[] }>(
          `/clients?limit=50&page=1${searchParam}`
        );
        setClients(response.data.data);
      } catch (error) {
        console.error('Failed to load clients:', error);
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadClients();
    }
  }, [open, debouncedSearch]);

  // Загрузка выбранного клиента при инициализации
  useEffect(() => {
    if (value && !selectedClient) {
      const loadSelectedClient = async () => {
        try {
          const response = await apiClient.get<Client>(`/clients/${value}`);
          setSelectedClient(response.data);
        } catch (error) {
          console.error('Failed to load selected client:', error);
        }
      };
      loadSelectedClient();
    } else if (!value) {
      setSelectedClient(null);
    }
  }, [value, selectedClient]);

  // Обработка выбора клиента
  const handleSelect = useCallback((client: Client) => {
    setSelectedClient(client);
    onValueChange(client.id);
    onClientSelect?.(client);
    setOpen(false);
    setSearch('');
  }, [onValueChange, onClientSelect]);

  // Очистка выбора
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(null);
    onValueChange(undefined);
    onClientSelect?.(null);
    setSearch('');
  }, [onValueChange, onClientSelect]);

  // Открытие страницы создания клиента
  const handleCreateClient = useCallback(() => {
    window.open('/clients/new', '_blank');
    setOpen(false);
  }, []);

  // Показать поле ввода или выбранного клиента
  const displayValue = selectedClient ? getFullName(selectedClient) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div className={cn('relative', className)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={open ? search : displayValue}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              if (!disabled) {
                setOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pl-9 pr-8',
              selectedClient && !open && 'font-medium'
            )}
          />
          {selectedClient && !open && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width]"
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Загрузка...
              </div>
            ) : clients.length === 0 ? (
              <CommandEmpty>
                {debouncedSearch ? 'Клиенты не найдены' : 'Начните вводить для поиска'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {clients
                  .filter((client) => !excludeClientId || client.id !== excludeClientId)
                  .map((client) => {
                  const age = calculateAge(client.dateOfBirth);
                  const status = statusConfig[client.status];
                  const isSelected = value === client.id;

                  return (
                    <CommandItem
                      key={client.id}
                      value={client.id}
                      onSelect={() => handleSelect(client)}
                      className="flex flex-col items-start gap-1 py-3"
                    >
                      <div className="flex items-center w-full gap-2">
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span
                          className="font-medium truncate flex-1"
                          title={getFullName(client)}
                        >
                          {getFullName(client)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-6 text-sm text-muted-foreground">
                        <Badge variant={status.variant} className="text-xs h-5">
                          {status.label}
                        </Badge>
                        {age !== null && (
                          <span>{formatAge(age)}</span>
                        )}
                        <span className="text-muted-foreground/70">•</span>
                        <span>{formatPhone(client.phone)}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {showCreateButton && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateClient}
                    className="text-primary cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Создать нового клиента
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
