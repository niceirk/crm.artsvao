'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Calendar, CalendarDays, LayoutList, Grid3x3, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getCurrentDate } from '@/lib/utils/time-slots';
import { getWeekStart, formatDateFull, formatWeekRange } from '@/lib/utils/chess-grid';
import { RoomPlannerFilters } from './components/room-planner-filters';
import { ScheduleView } from './components/schedule-view';
import { SearchView } from './components/search-view';
import { ChessView } from './components/chess-view';
import { ChessWeekView } from './components/chess-week-view';
import { RoomDetailSheet } from './components/room-detail-sheet';
import { CalendarEventDialog } from '../schedule/calendar-event-dialog';
import { AttendanceSheet } from '../schedule/attendance-sheet';
import { Button } from '@/components/ui/button';
import { useRoomPlannerScaleStore } from '@/lib/stores/room-planner-scale-store';
import type { Schedule } from '@/lib/api/schedules';
import type { Rental } from '@/lib/api/rentals';
import type { Event } from '@/lib/api/events';
import type { Reservation } from '@/lib/api/reservations';
import type { Activity, ActivityType, RoomWithActivities } from '@/hooks/use-room-planner';

export default function RoomPlannerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Читаем начальные значения из URL
  const getInitialTab = (): 'schedule' | 'search' | 'chess' => {
    const tab = searchParams.get('tab');
    if (tab === 'schedule' || tab === 'search' || tab === 'chess') return tab;
    return 'chess'; // По умолчанию шахматка
  };

  const getInitialChessViewMode = (): 'day' | 'week' => {
    const mode = searchParams.get('mode');
    if (mode === 'day' || mode === 'week') return mode;
    return 'day';
  };

  const getInitialRoomIds = (): string[] => {
    const rooms = searchParams.get('rooms');
    return rooms ? rooms.split(',').filter(Boolean) : [];
  };

  const getInitialActivityTypes = (): ActivityType[] => {
    const types = searchParams.get('types');
    if (!types) return [];
    return types.split(',').filter((t): t is ActivityType =>
      ['schedule', 'rental', 'event', 'reservation'].includes(t)
    );
  };

  // Состояние вкладок
  const [activeTab, setActiveTab] = useState<'schedule' | 'search' | 'chess'>(getInitialTab);

  // Состояние фильтров режима "Расписание"
  const [date, setDate] = useState(() => searchParams.get('date') || getCurrentDate());
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(getInitialRoomIds);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<ActivityType[]>(getInitialActivityTypes);
  const [showNowOnly, setShowNowOnly] = useState(() => searchParams.get('now') === 'true');

  // Состояние режима шахматки (день/неделя)
  const [chessViewMode, setChessViewMode] = useState<'day' | 'week'>(getInitialChessViewMode);

  // Обновление URL при изменении фильтров
  const updateUrl = useCallback((params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    const newUrl = newParams.toString() ? `${pathname}?${newParams.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Синхронизация состояния с URL
  useEffect(() => {
    const params: Record<string, string | null> = {
      tab: activeTab === 'chess' ? null : activeTab, // chess - по умолчанию, не пишем в URL
      date: date === getCurrentDate() ? null : date,
      mode: chessViewMode === 'day' ? null : chessViewMode,
      rooms: selectedRoomIds.length > 0 ? selectedRoomIds.join(',') : null,
      types: selectedActivityTypes.length > 0 ? selectedActivityTypes.join(',') : null,
      now: showNowOnly ? 'true' : null,
    };
    updateUrl(params);
  }, [activeTab, date, chessViewMode, selectedRoomIds, selectedActivityTypes, showNowOnly, updateUrl]);

  // Состояние детальной карточки
  const [selectedRoom, setSelectedRoom] = useState<RoomWithActivities | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  // Состояние диалога создания активности
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogInitialData, setCreateDialogInitialData] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    roomId: string;
  } | null>(null);

  // Состояние диалога редактирования активности (для шахматки)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>(undefined);
  const [selectedRental, setSelectedRental] = useState<Rental | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | undefined>(undefined);

  // Состояние журнала посещаемости
  const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = useState(false);

  // Масштаб для режима шахматки
  const { scale, increaseScale, decreaseScale } = useRoomPlannerScaleStore();

  // Обработчик клика по помещению
  const handleRoomClick = (roomWithActivities: RoomWithActivities) => {
    setSelectedRoom(roomWithActivities);
    setIsDetailSheetOpen(true);
  };

  // Обработчик создания активности
  const handleCreateActivity = (roomId: string, startTime: string, endTime: string) => {
    setCreateDialogInitialData({
      date,
      startTime,
      endTime,
      roomId,
    });
    setIsCreateDialogOpen(true);
  };

  // Обработчик клика по активности в шахматке (открытие редактирования)
  const handleActivityClick = (activity: Activity) => {
    // Сбрасываем все предыдущие состояния
    setSelectedSchedule(undefined);
    setSelectedRental(undefined);
    setSelectedEvent(undefined);
    setSelectedReservation(undefined);

    // Устанавливаем нужный тип в зависимости от activity.type
    switch (activity.type) {
      case 'schedule':
        setSelectedSchedule(activity.originalData as Schedule);
        break;
      case 'rental':
        setSelectedRental(activity.originalData as Rental);
        break;
      case 'event':
        setSelectedEvent(activity.originalData as Event);
        break;
      case 'reservation':
        setSelectedReservation(activity.originalData as Reservation);
        break;
    }

    setIsEditDialogOpen(true);
  };

  // Обработчик клика по пустому слоту в шахматке (дневной режим)
  const handleEmptySlotClick = (roomId: string, startTime: string, endTime: string) => {
    handleCreateActivity(roomId, startTime, endTime);
  };

  // Обработчик клика по пустому слоту в недельном режиме
  const handleWeekEmptySlotClick = (clickedDate: string, startTime: string, endTime: string) => {
    setCreateDialogInitialData({
      date: clickedDate,
      startTime,
      endTime,
      roomId: '', // Без помещения - пользователь выберет в диалоге
    });
    setIsCreateDialogOpen(true);
  };

  // Закрытие диалога редактирования
  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setSelectedSchedule(undefined);
      setSelectedRental(undefined);
      setSelectedEvent(undefined);
      setSelectedReservation(undefined);
    }
  };

  // Компонент кликабельной надписи-таба
  const TabLink = ({
    value,
    label,
    icon: Icon,
    isActive
  }: {
    value: 'schedule' | 'search' | 'chess';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        'text-sm transition-colors border-b border-dashed pb-0.5 inline-flex items-center gap-1',
        isActive
          ? 'text-foreground border-foreground/50'
          : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/50'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 px-1 sm:px-2 md:px-3 lg:px-4 pt-2 pb-2">
      {/* Верхний заголовок с табами */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-h-8">
          <TabLink value="schedule" label="Расписание" icon={LayoutList} isActive={activeTab === 'schedule'} />
          <TabLink value="chess" label="Шахматка" icon={Grid3x3} isActive={activeTab === 'chess'} />
          <TabLink value="search" label="Подбор" icon={Search} isActive={activeTab === 'search'} />

          {/* Дополнительные элементы для режима шахматки */}
          {activeTab === 'chess' && (
            <>
              <div className="h-5 w-px bg-border ml-4" />

              {/* Переключатель День/Неделя */}
              <button
                onClick={() => setChessViewMode('day')}
                className={cn(
                  'text-sm transition-colors border-b border-dashed pb-0.5 inline-flex items-center gap-1',
                  chessViewMode === 'day'
                    ? 'text-foreground border-foreground/50'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                День
              </button>
              <button
                onClick={() => setChessViewMode('week')}
                className={cn(
                  'text-sm transition-colors border-b border-dashed pb-0.5 inline-flex items-center gap-1',
                  chessViewMode === 'week'
                    ? 'text-foreground border-foreground/50'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Неделя
              </button>
            </>
          )}
        </div>

        {/* Дата по центру для режима шахматки */}
        {activeTab === 'chess' && (
          <span className="text-sm font-medium text-foreground">
            {chessViewMode === 'day'
              ? formatDateFull(date)
              : formatWeekRange(getWeekStart(date))
            }
          </span>
        )}

        {/* Контролы масштабирования для режима шахматки */}
        {activeTab === 'chess' && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={decreaseScale}
              disabled={scale <= 0.9}
              className="h-7 px-2"
              title="Уменьшить масштаб"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={increaseScale}
              disabled={scale >= 1.3}
              className="h-7 px-2"
              title="Увеличить масштаб"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Фильтры справа для режима шахматки */}
        {activeTab === 'chess' && (
          <RoomPlannerFilters
            date={date}
            onDateChange={setDate}
            selectedRoomIds={selectedRoomIds}
            onRoomsChange={setSelectedRoomIds}
            selectedActivityTypes={selectedActivityTypes}
            onActivityTypesChange={setSelectedActivityTypes}
            showNowOnly={showNowOnly}
            onShowNowOnlyChange={setShowNowOnly}
            hideNowOnlyFilter
            hideRoomsFilter={chessViewMode === 'week'}
            viewMode={chessViewMode}
          />
        )}
        {activeTab !== 'chess' && (
          <Link
            href="/schedule"
            className="text-sm text-muted-foreground hover:text-foreground border-b border-dashed border-muted-foreground/50 hover:border-foreground transition-colors whitespace-nowrap"
          >
            Старая версия
          </Link>
        )}
      </div>

      {/* Режим "Расписание" */}
      {activeTab === 'schedule' && (
        <div className="flex flex-col gap-4 mt-4">
          {/* Фильтры */}
          <RoomPlannerFilters
            date={date}
            onDateChange={setDate}
            selectedRoomIds={selectedRoomIds}
            onRoomsChange={setSelectedRoomIds}
            selectedActivityTypes={selectedActivityTypes}
            onActivityTypesChange={setSelectedActivityTypes}
            showNowOnly={showNowOnly}
            onShowNowOnlyChange={setShowNowOnly}
          />

          {/* Список помещений */}
          <ScheduleView
            date={date}
            roomIds={selectedRoomIds}
            activityTypes={selectedActivityTypes}
            showNowOnly={showNowOnly}
            onRoomClick={handleRoomClick}
            onCreateActivity={handleCreateActivity}
          />
        </div>
      )}

      {/* Режим "Шахматка" */}
      {activeTab === 'chess' && (
        <>
          {/* Шахматка - День или Неделя */}
          {chessViewMode === 'day' ? (
            <ChessView
              date={date}
              roomIds={selectedRoomIds.length > 0 ? selectedRoomIds : undefined}
              activityTypes={selectedActivityTypes.length > 0 ? selectedActivityTypes : undefined}
              onActivityClick={handleActivityClick}
              onEmptySlotClick={handleEmptySlotClick}
            />
          ) : (
            <ChessWeekView
              weekStartDate={getWeekStart(date)}
              roomIds={selectedRoomIds.length > 0 ? selectedRoomIds : undefined}
              activityTypes={selectedActivityTypes.length > 0 ? selectedActivityTypes : undefined}
              onActivityClick={handleActivityClick}
              onEmptySlotClick={handleWeekEmptySlotClick}
            />
          )}
        </>
      )}

      {/* Режим "Подбор помещений" */}
      {activeTab === 'search' && (
        <div className="mt-4">
          <SearchView
            date={date}
            onDateChange={setDate}
            onRoomClick={handleRoomClick}
          />
        </div>
      )}

      {/* Детальная карточка помещения */}
      <RoomDetailSheet
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        roomWithActivities={selectedRoom}
        date={date}
      />

      {/* Диалог создания активности */}
      <CalendarEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialData={createDialogInitialData ?? undefined}
      />

      {/* Диалог редактирования активности (для шахматки) */}
      <CalendarEventDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        schedule={selectedSchedule}
        rental={selectedRental}
        event={selectedEvent}
        reservation={selectedReservation}
        onOpenAttendance={() => {
          if (selectedSchedule) {
            setIsEditDialogOpen(false);
            setIsAttendanceSheetOpen(true);
          }
        }}
      />

      {/* Журнал посещаемости */}
      {selectedSchedule && selectedSchedule.group && (
        <AttendanceSheet
          open={isAttendanceSheetOpen}
          onOpenChange={setIsAttendanceSheetOpen}
          scheduleId={selectedSchedule.id}
          groupId={selectedSchedule.group.id}
          groupName={selectedSchedule.group.name}
          startTime={selectedSchedule.startTime}
          scheduleDate={selectedSchedule.date}
        />
      )}

    </div>
  );
}
