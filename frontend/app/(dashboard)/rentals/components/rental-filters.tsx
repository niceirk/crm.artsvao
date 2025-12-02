'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
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
  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Поиск */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру заявки или клиенту..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      {/* Статус */}
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

      {/* Тип аренды */}
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

      {/* Очистить фильтры */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Очистить
        </Button>
      )}
    </div>
  );
}
