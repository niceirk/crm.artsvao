'use client';

import { useState } from 'react';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
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
import {
  syncRoomsBidirectional,
  detectSyncConflicts,
  EventTypeConflict,
  RoomConflict,
} from '@/lib/api/pyrus';
import { toast } from 'sonner';
import { ConflictResolutionDialog } from '@/components/sync/ConflictResolutionDialog';

export default function RoomsPage() {
  const { data: rooms, isLoading, refetch } = useRooms();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [eventTypeConflicts, setEventTypeConflicts] = useState<EventTypeConflict[]>([]);
  const [roomConflicts, setRoomConflicts] = useState<RoomConflict[]>([]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncRoomsBidirectional();

      const totalCreated = result.fromPyrus.created + result.toPyrus.created;
      const totalUpdated = result.fromPyrus.updated + result.toPyrus.updated;
      const totalErrors = [...result.fromPyrus.errors, ...result.toPyrus.errors];

      if (totalErrors.length > 0) {
        // Показываем конфликты и потенциальные дубли
        const conflicts = totalErrors.filter(e => e.includes('КОНФЛИКТ'));
        const duplicates = totalErrors.filter(e => e.includes('дубль'));

        toast.warning(
          `Синхронизация завершена с предупреждениями!\n` +
          `Создано: ${totalCreated}, Обновлено: ${totalUpdated}\n` +
          (conflicts.length > 0 ? `⚠️ Конфликтов: ${conflicts.length}\n` : '') +
          (duplicates.length > 0 ? `⚠️ Потенциальных дублей: ${duplicates.length}\n` : '') +
          `Проверьте детали в консоли`,
          { duration: 8000 }
        );

        console.group('🔍 Детали синхронизации помещений:');
        if (conflicts.length > 0) {
          console.group('⚠️ Конфликты (требуется ручное разрешение):');
          conflicts.forEach(c => console.warn(c));
          console.groupEnd();
        }
        if (duplicates.length > 0) {
          console.group('⚠️ Потенциальные дубли (создание пропущено):');
          duplicates.forEach(d => console.warn(d));
          console.groupEnd();
        }
        console.groupEnd();

        // Проверяем наличие реальных конфликтов и показываем диалог
        if (conflicts.length > 0) {
          await checkAndShowConflicts();
        }
      } else {
        toast.success(
          `Синхронизация завершена!\n` +
          `Создано: ${totalCreated}, Обновлено: ${totalUpdated}`
        );
      }

      // Обновляем список помещений
      refetch();
    } catch (error: any) {
      console.error('Ошибка синхронизации:', error);
      toast.error('Ошибка синхронизации с Pyrus: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsSyncing(false);
    }
  };

  const checkAndShowConflicts = async () => {
    try {
      const conflicts = await detectSyncConflicts();
      // На странице помещений показываем только конфликты помещений
      if (conflicts.roomConflicts.length > 0) {
        setEventTypeConflicts([]); // Не показываем конфликты типов мероприятий
        setRoomConflicts(conflicts.roomConflicts);
        setIsConflictDialogOpen(true);
      }
    } catch (error) {
      console.error('Ошибка при проверке конфликтов:', error);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Помещения</h2>
          <p className="text-muted-foreground">
            Управление помещениями культурного центра
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Синхронизация с Pyrus
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить помещение
          </Button>
        </div>
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

      <ConflictResolutionDialog
        open={isConflictDialogOpen}
        onOpenChange={setIsConflictDialogOpen}
        eventTypeConflicts={eventTypeConflicts}
        roomConflicts={roomConflicts}
        onResolved={() => {
          refetch();
          toast.success('Конфликты успешно разрешены!');
        }}
      />
    </div>
  );
}
