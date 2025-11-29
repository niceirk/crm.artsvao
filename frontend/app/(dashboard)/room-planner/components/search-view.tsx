'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarIcon,
  Search,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  Sunrise,
  Sunset,
  LayoutGrid,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  useRoomSearch,
  useRoomPlanner,
  type RoomWithActivities,
} from '@/hooks/use-room-planner';
import type { Room } from '@/lib/api/rooms';

interface SearchViewProps {
  date: string;
  onDateChange: (date: string) => void;
  onRoomClick: (room: RoomWithActivities) => void;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  HALL: 'Зал',
  CLASS: 'Класс',
  STUDIO: 'Студия',
  CONFERENCE: 'Конференц-зал',
};

// Категории времени
type TimeCategory = 'all' | 'morning' | 'afternoon' | 'evening';

const TIME_CATEGORIES: {
  id: TimeCategory;
  label: string;
  icon: typeof Sun;
  startHour: number;
  endHour: number;
}[] = [
  { id: 'all', label: 'Все', icon: LayoutGrid, startHour: 8, endHour: 22 },
  { id: 'morning', label: 'Утро', icon: Sunrise, startHour: 8, endHour: 12 },
  { id: 'afternoon', label: 'День', icon: Sun, startHour: 12, endHour: 17 },
  { id: 'evening', label: 'Вечер', icon: Sunset, startHour: 17, endHour: 22 },
];

// Генерация часовых слотов для категории
function generateHourlySlots(startHour: number, endHour: number): { start: string; end: string; label: string }[] {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const start = `${hour.toString().padStart(2, '0')}:00`;
    const end = `${(hour + 1).toString().padStart(2, '0')}:00`;
    slots.push({ start, end, label: `${hour}:00` });
  }
  return slots;
}

export function SearchView({ date, onDateChange, onRoomClick }: SearchViewProps) {
  // Состояние фильтров
  const [selectedCategory, setSelectedCategory] = useState<TimeCategory>('all');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Получаем категорию
  const currentCategory = TIME_CATEGORIES.find(c => c.id === selectedCategory) || TIME_CATEGORIES[0];

  // Генерируем слоты для текущей категории
  const hourlySlots = useMemo(() =>
    generateHourlySlots(currentCategory.startHour, currentCategory.endHour),
    [currentCategory]
  );

  // Вычисляем время для поиска на основе выбранных слотов
  const { timeStart, timeEnd } = useMemo(() => {
    if (selectedSlots.size === 0) {
      // Если ничего не выбрано - весь интервал категории
      return {
        timeStart: `${currentCategory.startHour.toString().padStart(2, '0')}:00`,
        timeEnd: `${currentCategory.endHour.toString().padStart(2, '0')}:00`,
      };
    }

    // Находим минимальное и максимальное время из выбранных слотов
    const selectedHours = Array.from(selectedSlots).map(s => parseInt(s.split(':')[0])).sort((a, b) => a - b);
    const minHour = selectedHours[0];
    const maxHour = selectedHours[selectedHours.length - 1] + 1; // +1 для конца последнего слота

    return {
      timeStart: `${minHour.toString().padStart(2, '0')}:00`,
      timeEnd: `${maxHour.toString().padStart(2, '0')}:00`,
    };
  }, [selectedSlots, currentCategory]);

  // Поиск
  const {
    searchResults,
    isLoading,
    error,
    totalFound,
    availableCount,
  } = useRoomSearch({
    date,
    timeStart,
    timeEnd,
    onlyAvailable: false, // Показываем все помещения, включая занятые
  });

  // Получаем данные о помещениях для передачи в onRoomClick
  const { roomsWithActivities } = useRoomPlanner({ date });

  // Фильтрация результатов по поисковому запросу
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return searchResults;

    const query = searchQuery.toLowerCase().trim();
    return searchResults.filter((result) => {
      // Поиск по названию помещения
      if (result.room.name.toLowerCase().includes(query)) return true;
      // Поиск по номеру помещения
      if (result.room.number?.toLowerCase().includes(query)) return true;
      // Поиск по типу помещения
      const typeLabel = ROOM_TYPE_LABELS[result.room.type]?.toLowerCase();
      if (typeLabel?.includes(query)) return true;
      return false;
    });
  }, [searchResults, searchQuery]);

  // Обработчик клика по результату
  const handleResultClick = (roomId: string) => {
    const rwa = roomsWithActivities.find((r) => r.room.id === roomId);
    if (rwa) {
      onRoomClick(rwa);
    }
  };

  // Обработчик выбора категории
  const handleCategoryChange = (category: TimeCategory) => {
    setSelectedCategory(category);
    setSelectedSlots(new Set()); // Сбрасываем выбранные слоты при смене категории
  };

  // Обработчик выбора слота (toggle)
  const handleSlotClick = (slot: { start: string; end: string }) => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slot.start)) {
        newSet.delete(slot.start);
      } else {
        newSet.add(slot.start);
      }
      return newSet;
    });
  };

  // Сброс всех слотов
  const handleClearSlots = () => {
    setSelectedSlots(new Set());
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Фильтры поиска */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Подбор помещений
            </CardTitle>

            {/* Выбор даты */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => onDateChange(format(subDays(parseISO(date), 1), 'yyyy-MM-dd'))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[160px] justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date
                      ? format(parseISO(date), 'd MMM yyyy', { locale: ru })
                      : 'Выберите дату'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date ? parseISO(date) : undefined}
                    onSelect={(d) => d && onDateChange(format(d, 'yyyy-MM-dd'))}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => onDateChange(format(addDays(parseISO(date), 1), 'yyyy-MM-dd'))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Поле поиска */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию помещения..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
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

          {/* Категории времени */}
          <div className="flex flex-wrap items-center gap-2">
            {TIME_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <Button
                  key={category.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategoryChange(category.id)}
                  className={cn(
                    'gap-2 transition-colors',
                    isSelected
                      ? 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600'
                      : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                  <span className={cn('text-xs', isSelected ? 'opacity-80' : 'opacity-60')}>
                    {category.startHour}:00-{category.endHour}:00
                  </span>
                </Button>
              );
            })}
            {selectedSlots.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleClearSlots}
              >
                <X className="h-4 w-4 mr-1" />
                Сбросить ({selectedSlots.size})
              </Button>
            )}
          </div>

          {/* Часовые слоты */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Выберите часы (можно несколько):
            </div>
            <div className="flex flex-wrap gap-2">
              {hourlySlots.map((slot) => {
                const isSelected = selectedSlots.has(slot.start);
                return (
                  <Button
                    key={slot.start}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSlotClick(slot)}
                    className={cn(
                      'min-w-[70px] transition-colors',
                      isSelected
                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600'
                        : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                    )}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {slot.label}
                  </Button>
                );
              })}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Результаты поиска */}
      <div className="flex flex-col gap-4">
        {/* Статистика */}
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{filteredResults.length}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">найдено</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-700">
              {filteredResults.filter(r => r.isAvailable).length}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">
              {filteredResults.filter(r => !r.isAvailable).length}
            </span>
          </div>
        </div>

        {/* Список результатов */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Ошибка загрузки: {error.message}
              </p>
            </CardContent>
          </Card>
        ) : filteredResults.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Помещения не найдены по вашему запросу.'
                  : 'Помещения не найдены. Попробуйте изменить параметры поиска.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResults.map((result) => (
              <Card
                key={result.room.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  result.isAvailable
                    ? 'border-green-200 hover:border-green-300'
                    : 'border-red-200 hover:border-red-300'
                )}
                onClick={() => handleResultClick(result.room.id)}
              >
                <CardContent className="pt-6">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {result.room.name}
                        {result.room.number && (
                          <span className="text-muted-foreground font-normal text-sm">
                            ({result.room.number})
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {ROOM_TYPE_LABELS[result.room.type] || result.room.type}
                        </Badge>
                        {result.room.capacity && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {result.room.capacity}
                          </span>
                        )}
                        {result.room.area && <span>{result.room.area} м²</span>}
                      </div>
                    </div>

                    {/* Статус */}
                    {result.isAvailable ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Информация о доступности */}
                  <div
                    className={cn(
                      'p-2 rounded-md text-sm',
                      result.isAvailable ? 'bg-green-50' : 'bg-red-50'
                    )}
                  >
                    {result.isAvailable ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <Clock className="h-4 w-4" />
                        <span>
                          Свободно {timeStart}–{timeEnd}
                        </span>
                      </div>
                    ) : (
                      <div className="text-red-700 space-y-1">
                        <div className="font-medium flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Занято ({result.conflictingActivities.length}):
                        </div>
                        <div className="space-y-1 pl-4">
                          {result.conflictingActivities.slice(0, 3).map((activity) => (
                            <div key={activity.id} className="text-xs flex items-center gap-1">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: activity.color }}
                              />
                              <span className="truncate">{activity.title}</span>
                              <span className="text-red-500 flex-shrink-0">
                                {activity.startTime}–{activity.endTime}
                              </span>
                            </div>
                          ))}
                          {result.conflictingActivities.length > 3 && (
                            <div className="text-xs text-red-500">
                              +{result.conflictingActivities.length - 3} ещё...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
