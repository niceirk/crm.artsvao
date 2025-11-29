'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Clock, Users, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useRoomPlanner,
  type ActivityType,
  type RoomWithActivities,
} from '@/hooks/use-room-planner';
import { formatDuration } from '@/lib/utils/time-slots';
import { ActivityItem } from './activity-item';
import { FreeSlotItem } from './free-slot-item';

interface ScheduleViewProps {
  date: string;
  roomIds?: string[];
  activityTypes?: ActivityType[];
  showNowOnly?: boolean;
  onRoomClick: (room: RoomWithActivities) => void;
  onCreateActivity: (roomId: string, startTime: string, endTime: string) => void;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  HALL: 'Зал',
  CLASS: 'Класс',
  STUDIO: 'Студия',
  CONFERENCE: 'Конференц-зал',
};

export function ScheduleView({
  date,
  roomIds,
  activityTypes,
  showNowOnly,
  onRoomClick,
  onCreateActivity,
}: ScheduleViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    roomsWithActivities,
    isLoading,
    error,
    totalRooms,
    withActivities,
    withoutActivities,
    occupiedNow,
    isToday,
  } = useRoomPlanner({
    date,
    roomIds,
    activityTypes,
    showNowOnly,
  });

  // Фильтрация по поисковому запросу
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return roomsWithActivities;

    const query = searchQuery.toLowerCase().trim();
    return roomsWithActivities.filter((rwa) => {
      // Поиск по названию помещения
      if (rwa.room.name.toLowerCase().includes(query)) return true;
      // Поиск по номеру помещения
      if (rwa.room.number?.toLowerCase().includes(query)) return true;
      // Поиск по типу помещения
      const typeLabel = ROOM_TYPE_LABELS[rwa.room.type]?.toLowerCase();
      if (typeLabel?.includes(query)) return true;
      // Поиск по названию активности
      if (rwa.activities.some(a => a.title.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [roomsWithActivities, searchQuery]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">
            Ошибка загрузки данных: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Поиск и статистика */}
      <div className="flex items-center gap-3">
        {/* Поле поиска */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Статистика */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{filteredRooms.length}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">из {totalRooms}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-sm font-medium text-orange-700">{withActivities}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">{withoutActivities}</span>
          </div>

          {isToday && occupiedNow > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-700">{occupiedNow}</span>
            </div>
          )}
        </div>
      </div>

      {/* Список помещений */}
      {filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Ничего не найдено по вашему запросу'
                : showNowOnly
                ? 'Нет активных занятий в данный момент'
                : 'Нет помещений для отображения'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((rwa) => (
          <RoomScheduleCard
            key={rwa.room.id}
            roomWithActivities={rwa}
            onClick={() => onRoomClick(rwa)}
            onSlotClick={(startTime, endTime) => onCreateActivity(rwa.room.id, startTime, endTime)}
          />
          ))}
        </div>
      )}
    </div>
  );
}

// Карточка помещения
interface RoomScheduleCardProps {
  roomWithActivities: RoomWithActivities;
  onClick: () => void;
  onSlotClick: (startTime: string, endTime: string) => void;
}

function RoomScheduleCard({ roomWithActivities, onClick, onSlotClick }: RoomScheduleCardProps) {
  const { room, activities, freeSlots, currentActivity, isOccupiedNow, hasActivities } =
    roomWithActivities;

  // Тип помещения
  const roomTypeLabels: Record<string, string> = {
    HALL: 'Зал',
    CLASS: 'Класс',
    STUDIO: 'Студия',
    CONFERENCE: 'Конференц-зал',
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {room.name}
              {room.number && (
                <span className="text-muted-foreground font-normal text-sm">
                  ({room.number})
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {roomTypeLabels[room.type] || room.type}
              </Badge>
              {room.capacity && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.capacity}
                </span>
              )}
              {room.area && <span>{room.area} м²</span>}
            </div>
          </div>

          {/* Индикатор занятости */}
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              isOccupiedNow ? 'bg-red-500 animate-pulse' :
              hasActivities ? 'bg-orange-400' : 'bg-green-500'
            )}
            title={isOccupiedNow ? 'Занято сейчас' : hasActivities ? 'Есть активности' : 'Свободно'}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Список активностей */}
        {activities.length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Активности ({activities.length}):
            </div>
            {activities.slice(0, 3).map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isCurrentlyActive={activity.id === currentActivity?.id}
                variant="compact"
              />
            ))}
            {activities.length > 3 && (
              <div className="text-xs text-muted-foreground pl-2">
                +{activities.length - 3} ещё...
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Нет запланированных активностей
          </div>
        )}

        {/* Свободные слоты */}
        {freeSlots.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Свободно:
            </div>
            <div className="flex flex-wrap gap-1">
              {freeSlots.slice(0, 2).map((slot, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs font-normal cursor-pointer hover:bg-green-100 hover:text-green-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotClick(slot.startTime, slot.endTime);
                  }}
                >
                  {slot.startTime}–{slot.endTime}
                </Badge>
              ))}
              {freeSlots.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{freeSlots.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
