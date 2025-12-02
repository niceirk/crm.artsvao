'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RentalsTable } from './components/rentals-table';
import { RentalFilters } from './components/rental-filters';
import { useRentalApplications } from '@/hooks/use-rental-applications';
import { RentalApplicationFilters } from '@/lib/types/rental-applications';

export default function RentalsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<RentalApplicationFilters>({});

  const { data: applications, isLoading } = useRentalApplications(filters);

  // Подсчет статистики
  const stats = {
    total: applications?.length || 0,
    draft: applications?.filter(a => a.status === 'DRAFT').length || 0,
    confirmed: applications?.filter(a => a.status === 'CONFIRMED').length || 0,
    active: applications?.filter(a => a.status === 'ACTIVE').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Кнопки действий */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/rentals/workspaces">
            <Laptop className="h-4 w-4 mr-2" />
            Рабочие места
          </Link>
        </Button>
        <Button asChild>
          <Link href="/rentals/new">
            <Plus className="h-4 w-4 mr-2" />
            Новая заявка
          </Link>
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего заявок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Черновики</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Подтверждено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица заявок */}
      <Card>
        <CardHeader>
          <CardTitle>Заявки на аренду</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RentalFilters filters={filters} onFiltersChange={setFilters} />
          <RentalsTable
            applications={applications || []}
            isLoading={isLoading}
            onEdit={(id) => router.push(`/rentals/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
