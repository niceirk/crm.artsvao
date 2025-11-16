'use client';

import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ClientsTable } from './components/clients-table';
import { ClientCreateDialog } from './components/client-create-dialog';
import type { ClientFilterParams } from '@/lib/types/clients';

export default function ClientsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ClientFilterParams>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useClients(filters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value || undefined,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
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
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Добавить клиента
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>
            Поиск и фильтрация клиентов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Поиск по имени, телефону, email..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

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
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>

      <ClientCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
