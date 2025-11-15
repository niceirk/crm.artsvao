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
import { useEventTypes } from '@/hooks/use-event-types';
import { EventTypesTable } from './event-types-table';
import { EventTypeDialog } from './event-type-dialog';

export default function EventTypesPage() {
  const { data: eventTypes, isLoading } = useEventTypes();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Типы мероприятий</h2>
          <p className="text-muted-foreground">
            Справочник типов мероприятий культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить тип
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список типов мероприятий</CardTitle>
          <CardDescription>
            Всего типов: {eventTypes?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventTypesTable eventTypes={eventTypes || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <EventTypeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
