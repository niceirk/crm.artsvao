'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useStudios } from '@/hooks/use-studios';
import { StudiosTable } from './studios-table';
import { StudioDialog } from './studio-dialog';

export default function StudiosPage() {
  const { data: studios, isLoading } = useStudios();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudios = useMemo(() => {
    if (!studios) return [];

    const query = searchQuery.trim().toLowerCase();
    if (!query) return studios;

    return studios.filter((studio) =>
      studio.name.toLowerCase().includes(query)
    );
  }, [searchQuery, studios]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Студии</h2>
          <p className="text-muted-foreground">
            Управление студиями культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить студию
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Список студий</CardTitle>
            <CardDescription>
              Найдено студий: {filteredStudios.length}
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <StudiosTable studios={filteredStudios} isLoading={isLoading} />
        </CardContent>
      </Card>

      <StudioDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
