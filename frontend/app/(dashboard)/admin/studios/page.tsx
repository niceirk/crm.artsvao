'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useStudios } from '@/hooks/use-studios';
import { StudiosTable } from './studios-table';
import { StudioDialog } from './studio-dialog';

export default function StudiosPage() {
  const { data: studios, isLoading } = useStudios();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
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
        <CardHeader>
          <CardTitle>Список студий</CardTitle>
          <CardDescription>
            Всего студий: {studios?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudiosTable studios={studios || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <StudioDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
