'use client';

import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGroups } from '@/hooks/use-groups';
import { GroupsTable } from './groups-table';
import { GroupDialog } from './group-dialog';
import { GroupFilters } from './group-filters';
import { GroupFilters as FilterType } from '@/lib/api/groups';

export default function GroupsPage() {
  const [filters, setFilters] = useState<FilterType>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: response, isLoading } = useGroups(filters);

  const groups = response?.data || [];
  const meta = response?.meta;

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Группы</h2>
          <p className="text-muted-foreground">
            Управление группами культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить группу
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupFilters filters={filters} onFiltersChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список групп</CardTitle>
          <CardDescription>
            {meta ? `Найдено групп: ${meta.total}` : `Всего групп: ${groups.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupsTable groups={groups} isLoading={isLoading} />

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page === 1}
                onClick={() => handlePageChange(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Страница {meta.page} из {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page === meta.totalPages}
                onClick={() => handlePageChange(meta.page + 1)}
              >
                Вперёд
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <GroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
