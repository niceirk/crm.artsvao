'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Users,
  Square,
  Clock,
  Calendar,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { RoomWithActivities } from '@/hooks/use-room-planner';
import { ActivityItem } from './activity-item';
import { FreeSlotItem } from './free-slot-item';
import type { TimeSlot } from '@/lib/utils/time-slots';
import { CalendarEventDialog } from '../../schedule/calendar-event-dialog';

interface RoomDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomWithActivities: RoomWithActivities | null;
  date: string;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  HALL: 'Зал',
  CLASS: 'Класс',
  STUDIO: 'Студия',
  CONFERENCE: 'Конференц-зал',
};

export function RoomDetailSheet({
  open,
  onOpenChange,
  roomWithActivities,
  date,
}: RoomDetailSheetProps) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleInitialData, setScheduleInitialData] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    roomId: string;
  } | undefined>(undefined);

  if (!roomWithActivities) return null;

  const { room, activities, freeSlots, currentActivity, isOccupiedNow, hasActivities } =
    roomWithActivities;

  // Обработчик создания активности из слота
  const handleCreateActivity = (slot: TimeSlot) => {
    setScheduleInitialData({
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomId: room.id,
    });
    setScheduleDialogOpen(true);
  };

  // Обработчик создания новой активности (без слота)
  const handleCreateNewActivity = () => {
    setScheduleInitialData({
      date,
      startTime: '10:00',
      endTime: '11:00',
      roomId: room.id,
    });
    setScheduleDialogOpen(true);
  };

  // Открыть помещение на странице расписания
  const handleOpenInSchedule = () => {
    const url = `/schedule?date=${date}&roomId=${room.id}`;
    window.open(url, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                {room.name}
                {room.number && (
                  <span className="text-muted-foreground font-normal">
                    ({room.number})
                  </span>
                )}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: ru })}
              </SheetDescription>
            </div>

            {/* Индикатор статуса */}
            <div
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                isOccupiedNow
                  ? 'bg-red-100 text-red-700'
                  : hasActivities
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              )}
            >
              {isOccupiedNow ? 'Занято сейчас' : hasActivities ? 'Есть активности' : 'Свободно'}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6 pr-4">
          <div className="space-y-6">
            {/* Информация о помещении */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{ROOM_TYPE_LABELS[room.type] || room.type}</span>
              </div>
              {room.capacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>до {room.capacity} чел.</span>
                </div>
              )}
              {room.area && (
                <div className="flex items-center gap-2 text-sm">
                  <Square className="h-4 w-4 text-muted-foreground" />
                  <span>{room.area} м²</span>
                </div>
              )}
              {room.hourlyRate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{room.hourlyRate} ₽/час</span>
                </div>
              )}
            </div>

            {room.equipment && (
              <div className="text-sm">
                <span className="font-medium">Оборудование: </span>
                <span className="text-muted-foreground">{room.equipment}</span>
              </div>
            )}

            <Separator />

            {/* Текущая активность */}
            {currentActivity && (
              <>
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-red-600">
                    <Clock className="h-4 w-4" />
                    Сейчас
                  </h4>
                  <ActivityItem
                    activity={currentActivity}
                    isCurrentlyActive
                    variant="detailed"
                  />
                </div>
                <Separator />
              </>
            )}

            {/* Свободные окна */}
            {freeSlots.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2 text-green-600">
                  <Clock className="h-4 w-4" />
                  Свободные окна ({freeSlots.length})
                </h4>
                <div className="space-y-2">
                  {freeSlots.map((slot, index) => (
                    <FreeSlotItem
                      key={index}
                      slot={slot}
                      variant="detailed"
                      onCreateActivity={handleCreateActivity}
                    />
                  ))}
                </div>
              </div>
            )}

            {freeSlots.length === 0 && (
              <div className="p-4 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                На выбранную дату нет свободных окон
              </div>
            )}

            <Separator />

            {/* Все активности */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Активности за день ({activities.length})
              </h4>

              {activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      isCurrentlyActive={activity.id === currentActivity?.id}
                      variant="detailed"
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted text-muted-foreground text-sm text-center">
                  Нет запланированных активностей
                </div>
              )}
            </div>

            <Separator />

            {/* Действия */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleCreateNewActivity}
              >
                <Plus className="h-4 w-4 mr-2" />
                Запланировать
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenInSchedule}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

      {/* Универсальный диалог создания активности */}
      <CalendarEventDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        initialData={scheduleInitialData}
      />
    </Sheet>
  );
}
