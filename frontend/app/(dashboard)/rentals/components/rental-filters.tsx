'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useRooms } from '@/hooks/use-rooms';
import {
  RentalApplicationFilters,
  RentalApplicationStatus,
  RentalType,
  RENTAL_STATUS_LABELS,
  RENTAL_TYPE_LABELS,
} from '@/lib/types/rental-applications';

interface RentalFiltersProps {
  filters: RentalApplicationFilters;
  onFiltersChange: (filters: RentalApplicationFilters) => void;
}

export function RentalFilters({ filters, onFiltersChange }: RentalFiltersProps) {
  const { data: rooms } = useRooms();
  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру заявки или клиенту..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            status: value === 'all' ? undefined : value as RentalApplicationStatus,
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(RENTAL_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.rentalType || 'all'}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            rentalType: value === 'all' ? undefined : value as RentalType,
          })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Тип аренды" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(RENTAL_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.roomId || 'all'}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            roomId: value === 'all' ? undefined : value,
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Помещение" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все помещения</SelectItem>
            {rooms?.map((room) => (
              <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.invoiceStatus || 'all'}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            invoiceStatus: value === 'all' ? undefined : value as 'NONE' | 'PENDING' | 'PAID',
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус счёта" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все счета</SelectItem>
            <SelectItem value="NONE">Нет счёта</SelectItem>
            <SelectItem value="PENDING">Ожидает оплаты</SelectItem>
            <SelectItem value="PAID">Оплачен</SelectItem>
          </SelectContent>
        </Select>

        <DateRangePicker
          value={{ from: filters.bookingDateFrom, to: filters.bookingDateTo }}
          onChange={(range) => onFiltersChange({
            ...filters,
            bookingDateFrom: range.from,
            bookingDateTo: range.to,
          })}
          placeholder="Период бронирования"
          maxDate={new Date(2030, 11, 31)}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Очистить
          </Button>
        )}
      </div>
    </div>
  );
}
