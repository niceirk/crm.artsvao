'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useActiveLeadSources } from '@/hooks/useLeadSources';
import { useActiveBenefitCategories } from '@/hooks/useBenefitCategories';
import type { ClientFilterParams, ClientStatus } from '@/lib/types/clients';
import { FilterX } from 'lucide-react';

interface ClientFiltersPanelProps {
  filters: ClientFilterParams;
  onFiltersChange: (filters: ClientFilterParams) => void;
}

export function ClientFiltersPanel({ filters, onFiltersChange }: ClientFiltersPanelProps) {
  const { data: leadSources, isLoading: isLoadingLeadSources } = useActiveLeadSources();
  const { data: benefitCategories, isLoading: isLoadingBenefitCategories } = useActiveBenefitCategories();

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === '__empty__' ? undefined : (value as ClientStatus),
      page: 1,
    });
  };

  const handleLeadSourceChange = (value: string) => {
    onFiltersChange({
      ...filters,
      leadSourceId: value === '__empty__' ? undefined : value,
      page: 1,
    });
  };

  const handleBenefitCategoryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      benefitCategoryId: value === '__empty__' ? undefined : value,
      page: 1,
    });
  };

  const handleDateFromChange = (date: string | null) => {
    onFiltersChange({
      ...filters,
      dateFrom: date || undefined,
      page: 1,
    });
  };

  const handleDateToChange = (date: string | null) => {
    onFiltersChange({
      ...filters,
      dateTo: date || undefined,
      page: 1,
    });
  };

  const handleSubscriptionFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      subscriptionFilter: value as 'all' | 'with' | 'without',
      page: 1,
    });
  };

  const handleResetFilters = () => {
    onFiltersChange({
      page: 1,
      limit: filters.limit || 20,
    });
  };

  const hasActiveFilters = !!(
    filters.status ||
    filters.leadSourceId ||
    filters.benefitCategoryId ||
    filters.dateFrom ||
    filters.dateTo ||
    (filters.subscriptionFilter && filters.subscriptionFilter !== 'all')
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Статус */}
        <div>
          <Label htmlFor="status">Статус</Label>
          <Select
            value={filters.status || '__empty__'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все статусы</SelectItem>
              <SelectItem value="ACTIVE">Активный</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="INACTIVE">Неактивный</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Источник привлечения */}
        <div>
          <Label htmlFor="leadSource">Источник привлечения</Label>
          <Select
            value={filters.leadSourceId || '__empty__'}
            onValueChange={handleLeadSourceChange}
            disabled={isLoadingLeadSources}
          >
            <SelectTrigger id="leadSource">
              <SelectValue placeholder="Все источники" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все источники</SelectItem>
              {leadSources?.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Льготная категория */}
        <div>
          <Label htmlFor="benefitCategory">Льготная категория</Label>
          <Select
            value={filters.benefitCategoryId || '__empty__'}
            onValueChange={handleBenefitCategoryChange}
            disabled={isLoadingBenefitCategories}
          >
            <SelectTrigger id="benefitCategory">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все категории</SelectItem>
              {benefitCategories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name} ({category.discountPercent}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Дата регистрации с */}
        <div>
          <Label htmlFor="dateFrom">Регистрация с</Label>
          <DatePicker
            value={filters.dateFrom}
            onChange={handleDateFromChange}
            maxDate={new Date()}
          />
        </div>

        {/* Дата регистрации по */}
        <div>
          <Label htmlFor="dateTo">Регистрация по</Label>
          <DatePicker
            value={filters.dateTo}
            onChange={handleDateToChange}
            maxDate={new Date()}
          />
        </div>

        {/* Фильтр по абонементам */}
        <div>
          <Label htmlFor="subscriptionFilter">Абонементы</Label>
          <Select
            value={filters.subscriptionFilter || 'all'}
            onValueChange={handleSubscriptionFilterChange}
          >
            <SelectTrigger id="subscriptionFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все клиенты</SelectItem>
              <SelectItem value="with">С абонементами</SelectItem>
              <SelectItem value="without">Без абонементов</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Кнопка сброса фильтров */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="gap-2"
          >
            <FilterX className="h-4 w-4" />
            Сбросить фильтры
          </Button>
        </div>
      )}
    </div>
  );
}
