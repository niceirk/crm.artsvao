'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ClientsTable } from './components/clients-table';
import { ClientFiltersPanel } from './components/client-filters-panel';
import type { ClientFilterParams } from '@/lib/types/clients';
import { Filter, Search, Plus } from 'lucide-react';

export default function ClientsPage() {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ClientFilterParams>({
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useClients(filters);

  const handleFiltersChange = (newFilters: ClientFilterParams) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleSortChange = (sortBy: 'name' | 'createdAt' | 'dateOfBirth' | 'status') => {
    setFilters((prev) => {
      const newSortOrder =
        prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        sortBy,
        sortOrder: newSortOrder,
        page: 1, // Reset to first page when sorting changes
      };
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value || undefined,
      page: 1,
    }));
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Клиенты</h2>
          <p className="text-muted-foreground">
            Управление базой клиентов культурного центра
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
          </Button>
          <Button onClick={() => router.push('/clients/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить клиента
          </Button>
        </div>
      </div>

      {/* Поиск */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, телефону, email..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="pl-10 h-12 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
            <CardDescription>
              Поиск и фильтрация клиентов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientFiltersPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Список клиентов</CardTitle>
          <CardDescription>
            {data?.meta.total || 0} клиентов найдено
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Ошибка при загрузке клиентов
            </div>
          ) : (
            <ClientsTable
              clients={data?.data || []}
              currentPage={filters.page || 1}
              totalPages={data?.meta.totalPages || 1}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
