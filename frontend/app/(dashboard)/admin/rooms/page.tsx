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
import { useRooms } from '@/hooks/use-rooms';
import { RoomsTable } from './rooms-table';
import { RoomDialog } from './room-dialog';

export default function RoomsPage() {
  const { data: rooms, isLoading } = useRooms();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Помещения</h2>
          <p className="text-muted-foreground">
            Управление помещениями культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить помещение
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список помещений</CardTitle>
          <CardDescription>
            Всего помещений: {rooms?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomsTable rooms={rooms || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <RoomDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
