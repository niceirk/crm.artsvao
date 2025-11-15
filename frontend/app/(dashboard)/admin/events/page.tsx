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
import { useEvents } from '@/hooks/use-events';
import { EventsTable } from './events-table';
import { EventDialog } from './event-dialog';

export default function EventsPage() {
  const { data: events, isLoading } = useEvents();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Мероприятия</h2>
          <p className="text-muted-foreground">
            Управление мероприятиями культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить мероприятие
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список мероприятий</CardTitle>
          <CardDescription>
            Всего мероприятий: {events?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventsTable events={events || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <EventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
