'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, X, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRooms } from '@/hooks/use-rooms';
import { getCurrentDate } from '@/lib/utils/time-slots';
import { getWeekStart, formatWeekRange, isCurrentWeek } from '@/lib/utils/chess-grid';
import type { ActivityType } from '@/hooks/use-room-planner';
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-room-planner';

interface RoomPlannerFiltersProps {
  date: string;
  onDateChange: (date: string) => void;
  selectedRoomIds: string[];
  onRoomsChange: (roomIds: string[]) => void;
  selectedActivityTypes: ActivityType[];
  onActivityTypesChange: (types: ActivityType[]) => void;
  showNowOnly: boolean;
  onShowNowOnlyChange: (show: boolean) => void;
  hideNowOnlyFilter?: boolean;
  hideRoomsFilter?: boolean;
  hideDateFilter?: boolean;
  viewMode?: 'day' | 'week';
}

const ALL_ACTIVITY_TYPES: ActivityType[] = ['schedule', 'rental', 'event', 'reservation'];

export function RoomPlannerFilters({
  date,
  onDateChange,
  selectedRoomIds,
  onRoomsChange,
  selectedActivityTypes,
  onActivityTypesChange,
  showNowOnly,
  onShowNowOnlyChange,
  hideNowOnlyFilter,
  hideRoomsFilter,
  hideDateFilter,
  viewMode = 'day',
}: RoomPlannerFiltersProps) {
  const { data: rooms = [] } = useRooms();

  const isToday = date === getCurrentDate();
  const isWeekMode = viewMode === 'week';
  const weekStart = getWeekStart(date);
  const isTodayWeek = isCurrentWeek(date);

  // Обработчик выбора помещения
  const handleRoomSelect = (roomId: string) => {
    if (roomId === 'all') {
      onRoomsChange([]);
    } else {
      if (selectedRoomIds.includes(roomId)) {
        onRoomsChange(selectedRoomIds.filter((id) => id !== roomId));
      } else {
        onRoomsChange([...selectedRoomIds, roomId]);
      }
    }
  };

  // Обработчик выбора типа активности
  const handleActivityTypeSelect = (type: ActivityType) => {
    if (selectedActivityTypes.includes(type)) {
      onActivityTypesChange(selectedActivityTypes.filter((t) => t !== type));
    } else {
      onActivityTypesChange([...selectedActivityTypes, type]);
    }
  };

  // Обработчик кнопки "Сегодня"
  const handleToday = () => {
    onDateChange(getCurrentDate());
  };

  // Навигация по датам (день или неделя)
  const handlePrev = () => {
    const currentDate = parseISO(date);
    const daysToSubtract = isWeekMode ? 7 : 1;
    onDateChange(format(subDays(currentDate, daysToSubtract), 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    const currentDate = parseISO(date);
    const daysToAdd = isWeekMode ? 7 : 1;
    onDateChange(format(addDays(currentDate, daysToAdd), 'yyyy-MM-dd'));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Дата / Неделя */}
      {!hideDateFilter && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  isWeekMode ? 'w-[160px]' : 'w-[180px]',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                {isWeekMode
                  ? formatWeekRange(date)
                  : date
                    ? format(parseISO(date), 'd MMMM yyyy', { locale: ru })
                    : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date ? parseISO(date) : undefined}
                onSelect={(d) => d && onDateChange(format(d, 'yyyy-MM-dd'))}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={new Date().getFullYear() + 1}
                initialFocus
                locale={ru}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Кнопка "Сегодня" - для дневного режима если не сегодня, для недельного если не текущая неделя */}
          {((isWeekMode && !isTodayWeek) || (!isWeekMode && !isToday)) && (
            <Button variant="outline" size="sm" onClick={handleToday}>
              Сегодня
            </Button>
          )}
        </div>
      )}

      {/* Помещения */}
      {!hideRoomsFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[150px]">
              Помещения
              {selectedRoomIds.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedRoomIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-2" align="start">
            <div className="flex flex-col gap-1">
              <Button
                variant={selectedRoomIds.length === 0 ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => onRoomsChange([])}
              >
                Все помещения
              </Button>
              <div className="my-1 border-t" />
              {rooms
                .filter((room) => room.status === 'AVAILABLE')
                .map((room) => (
                  <Button
                    key={room.id}
                    variant={selectedRoomIds.includes(room.id) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => handleRoomSelect(room.id)}
                  >
                    {room.name}
                    {room.number && (
                      <span className="ml-1 text-muted-foreground">
                        ({room.number})
                      </span>
                    )}
                  </Button>
                ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Тип активности */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[120px]">
            Тип
            {selectedActivityTypes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedActivityTypes.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2" align="start">
          <div className="flex flex-col gap-1">
            <Button
              variant={selectedActivityTypes.length === 0 ? 'secondary' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onActivityTypesChange([])}
            >
              Все типы
            </Button>
            <div className="my-1 border-t" />
            {ALL_ACTIVITY_TYPES.map((type) => (
              <Button
                key={type}
                variant={selectedActivityTypes.includes(type) ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => handleActivityTypeSelect(type)}
              >
                {ACTIVITY_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Кнопка "СЕЙЧАС" */}
      {!hideNowOnlyFilter && (
        <Button
          variant={showNowOnly ? 'destructive' : 'outline'}
          onClick={() => onShowNowOnlyChange(!showNowOnly)}
          disabled={!isToday}
          className={cn(!isToday && 'opacity-50')}
        >
          <Radio className="mr-2 h-4 w-4" />
          СЕЙЧАС
        </Button>
      )}

      {/* Сброс фильтров */}
      {((!hideRoomsFilter && selectedRoomIds.length > 0) || selectedActivityTypes.length > 0) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!hideRoomsFilter) onRoomsChange([]);
            onActivityTypesChange([]);
          }}
        >
          <X className="mr-1 h-4 w-4" />
          Сбросить
        </Button>
      )}
    </div>
  );
}
