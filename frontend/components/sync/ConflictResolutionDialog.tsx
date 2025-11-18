'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  EventTypeConflict,
  RoomConflict,
  ConflictResolution,
  syncWithResolution,
} from '@/lib/api/pyrus';
import { toast } from 'sonner';
import { AlertCircle, Clock } from 'lucide-react';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTypeConflicts: EventTypeConflict[];
  roomConflicts: RoomConflict[];
  onResolved?: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  eventTypeConflicts,
  roomConflicts,
  onResolved,
}: ConflictResolutionDialogProps) {
  const [eventTypeResolutions, setEventTypeResolutions] = useState<
    Map<string, ConflictResolution>
  >(new Map());
  const [roomResolutions, setRoomResolutions] = useState<
    Map<string, ConflictResolution>
  >(new Map());
  const [isResolving, setIsResolving] = useState(false);

  // Инициализируем разрешения по умолчанию (SKIP)
  useEffect(() => {
    const eventTypeMap = new Map<string, ConflictResolution>();
    eventTypeConflicts.forEach((conflict) => {
      eventTypeMap.set(conflict.id, ConflictResolution.SKIP);
    });
    setEventTypeResolutions(eventTypeMap);

    const roomMap = new Map<string, ConflictResolution>();
    roomConflicts.forEach((conflict) => {
      roomMap.set(conflict.id, ConflictResolution.SKIP);
    });
    setRoomResolutions(roomMap);
  }, [eventTypeConflicts, roomConflicts]);

  const handleEventTypeResolution = (id: string, resolution: ConflictResolution) => {
    setEventTypeResolutions((prev) => new Map(prev).set(id, resolution));
  };

  const handleRoomResolution = (id: string, resolution: ConflictResolution) => {
    setRoomResolutions((prev) => new Map(prev).set(id, resolution));
  };

  const handleApply = async () => {
    setIsResolving(true);
    try {
      const result = await syncWithResolution({
        eventTypeResolutions: Array.from(eventTypeResolutions.entries()).map(
          ([id, resolution]) => ({ id, resolution })
        ),
        roomResolutions: Array.from(roomResolutions.entries()).map(([id, resolution]) => ({
          id,
          resolution,
        })),
      });

      const totalUpdated =
        result.eventTypes.updated +
        result.eventTypes.created +
        result.rooms.updated +
        result.rooms.created;
      const totalSkipped = result.eventTypes.skipped + result.rooms.skipped;
      const totalErrors = [...result.eventTypes.errors, ...result.rooms.errors];

      if (totalErrors.length > 0) {
        toast.warning(
          `Разрешение конфликтов завершено с ошибками!\n` +
            `Обновлено: ${totalUpdated}, Пропущено: ${totalSkipped}\n` +
            `Ошибок: ${totalErrors.length}`,
          { duration: 6000 }
        );
        console.error('Ошибки разрешения конфликтов:', totalErrors);
      } else {
        toast.success(
          `Конфликты успешно разрешены!\n` +
            `Обновлено: ${totalUpdated}, Пропущено: ${totalSkipped}`
        );
      }

      onOpenChange(false);
      onResolved?.();
    } catch (error: any) {
      console.error('Ошибка при разрешении конфликтов:', error);
      toast.error('Ошибка при разрешении конфликтов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsResolving(false);
    }
  };

  const totalConflicts = eventTypeConflicts.length + roomConflicts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Обнаружены конфликты синхронизации
          </DialogTitle>
          <DialogDescription>
            Найдено {totalConflicts} конфликт(ов). Выберите, какую версию данных использовать для
            каждого конфликта.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {/* Конфликты типов мероприятий */}
          {eventTypeConflicts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge variant="outline">Типы мероприятий</Badge>
                <span className="text-sm text-muted-foreground">
                  {eventTypeConflicts.length} конфликт(ов)
                </span>
              </h3>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Данные в CRM</TableHead>
                    <TableHead className="w-[200px]">Данные в Pyrus</TableHead>
                    <TableHead className="w-[150px]">Последняя синхр.</TableHead>
                    <TableHead>Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventTypeConflicts.map((conflict) => (
                    <TableRow key={conflict.id}>
                      <TableCell>
                        <div className="font-medium">{conflict.crmData.name}</div>
                        {conflict.crmData.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {conflict.crmData.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Изменено: {new Date(conflict.crmData.updatedAt).toLocaleString('ru-RU')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{conflict.pyrusData.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {conflict.lastSyncedAt
                            ? new Date(conflict.lastSyncedAt).toLocaleString('ru-RU')
                            : 'Никогда'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RadioGroup
                          value={eventTypeResolutions.get(conflict.id) || ConflictResolution.SKIP}
                          onValueChange={(value) =>
                            handleEventTypeResolution(conflict.id, value as ConflictResolution)
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={ConflictResolution.USE_CRM}
                              id={`event-${conflict.id}-crm`}
                            />
                            <Label
                              htmlFor={`event-${conflict.id}-crm`}
                              className="text-xs cursor-pointer"
                            >
                              Использовать CRM
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={ConflictResolution.USE_PYRUS}
                              id={`event-${conflict.id}-pyrus`}
                            />
                            <Label
                              htmlFor={`event-${conflict.id}-pyrus`}
                              className="text-xs cursor-pointer"
                            >
                              Использовать Pyrus
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={ConflictResolution.SKIP}
                              id={`event-${conflict.id}-skip`}
                            />
                            <Label
                              htmlFor={`event-${conflict.id}-skip`}
                              className="text-xs cursor-pointer"
                            >
                              Пропустить
                            </Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Конфликты помещений */}
          {roomConflicts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge variant="outline">Помещения</Badge>
                <span className="text-sm text-muted-foreground">
                  {roomConflicts.length} конфликт(ов)
                </span>
              </h3>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Данные в CRM</TableHead>
                    <TableHead className="w-[200px]">Данные в Pyrus</TableHead>
                    <TableHead className="w-[150px]">Последняя синхр.</TableHead>
                    <TableHead>Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomConflicts.map((conflict) => (
                    <TableRow key={conflict.id}>
                      <TableCell>
                        <div className="font-medium">{conflict.crmData.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Изменено: {new Date(conflict.crmData.updatedAt).toLocaleString('ru-RU')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{conflict.pyrusData.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {conflict.lastSyncedAt
                            ? new Date(conflict.lastSyncedAt).toLocaleString('ru-RU')
                            : 'Никогда'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RadioGroup
                          value={roomResolutions.get(conflict.id) || ConflictResolution.SKIP}
                          onValueChange={(value) =>
                            handleRoomResolution(conflict.id, value as ConflictResolution)
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={ConflictResolution.USE_CRM}
                              id={`room-${conflict.id}-crm`}
                            />
                            <Label
                              htmlFor={`room-${conflict.id}-crm`}
                              className="text-xs cursor-pointer"
                            >
                              Использовать CRM
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={ConflictResolution.USE_PYRUS}
                              id={`room-${conflict.id}-pyrus`}
                            />
                            <Label
                              htmlFor={`room-${conflict.id}-pyrus`}
                              className="text-xs cursor-pointer"
                            >
                              Использовать Pyrus
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={ConflictResolution.SKIP}
                              id={`room-${conflict.id}-skip`}
                            />
                            <Label
                              htmlFor={`room-${conflict.id}-skip`}
                              className="text-xs cursor-pointer"
                            >
                              Пропустить
                            </Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isResolving}>
            Отмена
          </Button>
          <Button onClick={handleApply} disabled={isResolving}>
            {isResolving ? 'Применение...' : 'Применить разрешения'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
