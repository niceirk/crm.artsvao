import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useCalendarEvents } from './use-calendar';
import { useRooms } from './use-rooms';
import { getAllCalendarEvents } from '@/lib/api/calendar';
import { getWeekDates } from '@/lib/utils/chess-grid';
import type { Room } from '@/lib/api/rooms';
import type { Schedule } from '@/lib/api/schedules';
import type { Rental } from '@/lib/api/rentals';
import type { Event } from '@/lib/api/events';
import type { Reservation } from '@/lib/api/reservations';
import type { CalendarEventStatus } from '@/lib/api/calendar-event-status';
import {
  calculateFreeSlots,
  isActivityCurrentlyActive,
  TimeSlot,
  getCurrentDate,
  getCurrentTime,
  parseTimeToHHmm,
} from '@/lib/utils/time-slots';

// Типы активностей
export type ActivityType = 'schedule' | 'rental' | 'event' | 'reservation';

// Объединенный тип активности
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  startTime: string;
  endTime: string;
  date: string;
  status: CalendarEventStatus;
  roomId: string;
  color: string;
  // Оригинальные данные
  originalData: Schedule | Rental | Event | Reservation;
}

// Помещение с активностями
export interface RoomWithActivities {
  room: Room;
  activities: Activity[];
  freeSlots: TimeSlot[];
  currentActivity?: Activity;
  isOccupiedNow: boolean;      // Занято прямо сейчас (только для сегодня)
  hasActivities: boolean;       // Есть активности на выбранную дату
  totalActivitiesCount: number;
}

// Фильтры для хука
export interface RoomPlannerFilters {
  date: string;
  roomIds?: string[];
  activityTypes?: ActivityType[];
  showNowOnly?: boolean;
}

// Цвета для типов активностей
export const ACTIVITY_COLORS: Record<string, string> = {
  // Schedule types
  GROUP_CLASS: '#3b82f6', // blue
  INDIVIDUAL_CLASS: '#10b981', // green
  OPEN_CLASS: '#f59e0b', // amber
  EVENT: '#8b5cf6', // purple (для schedule.type === 'EVENT')
  // Other activity types
  rental: '#dc2626', // red
  event: '#8b5cf6', // purple
  reservation: '#f59e0b', // amber
};

// Названия типов активностей
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  schedule: 'Занятие',
  rental: 'Аренда',
  event: 'Мероприятие',
  reservation: 'Резерв',
};

// Названия типов расписания
const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  GROUP_CLASS: 'Групповое занятие',
  INDIVIDUAL_CLASS: 'Индивидуальное занятие',
  OPEN_CLASS: 'Открытое занятие',
  EVENT: 'Мероприятие',
};

/**
 * Преобразует Schedule в Activity
 */
function scheduleToActivity(schedule: Schedule): Activity {
  const groupName = schedule.group?.name;
  const studioName = schedule.group?.studio?.name;
  const teacherName = schedule.teacher
    ? `${schedule.teacher.lastName} ${schedule.teacher.firstName.charAt(0)}.`
    : undefined;

  return {
    id: schedule.id,
    type: 'schedule',
    title: groupName || SCHEDULE_TYPE_LABELS[schedule.type] || 'Занятие',
    subtitle: teacherName || studioName,
    startTime: parseTimeToHHmm(schedule.startTime),
    endTime: parseTimeToHHmm(schedule.endTime),
    date: schedule.date,
    status: schedule.status,
    roomId: schedule.roomId,
    color: ACTIVITY_COLORS[schedule.type] || ACTIVITY_COLORS.GROUP_CLASS,
    originalData: schedule,
  };
}

/**
 * Преобразует Rental в Activity
 */
function rentalToActivity(rental: Rental): Activity {
  return {
    id: rental.id,
    type: 'rental',
    title: rental.eventType || 'Аренда',
    subtitle: rental.clientName,
    startTime: parseTimeToHHmm(rental.startTime),
    endTime: parseTimeToHHmm(rental.endTime),
    date: rental.date,
    status: rental.status,
    roomId: rental.roomId,
    color: ACTIVITY_COLORS.rental,
    originalData: rental,
  };
}

/**
 * Преобразует Event в Activity
 */
function eventToActivity(event: Event): Activity {
  return {
    id: event.id,
    type: 'event',
    title: event.name,
    subtitle: event.eventType?.name,
    startTime: parseTimeToHHmm(event.startTime),
    endTime: parseTimeToHHmm(event.endTime),
    date: event.date,
    status: event.status,
    roomId: event.roomId,
    color: event.eventType?.color || ACTIVITY_COLORS.event,
    originalData: event,
  };
}

/**
 * Преобразует Reservation в Activity
 */
function reservationToActivity(reservation: Reservation): Activity {
  return {
    id: reservation.id,
    type: 'reservation',
    title: 'Резерв',
    subtitle: reservation.reservedBy,
    startTime: parseTimeToHHmm(reservation.startTime),
    endTime: parseTimeToHHmm(reservation.endTime),
    date: reservation.date,
    status: reservation.status,
    roomId: reservation.roomId,
    color: ACTIVITY_COLORS.reservation,
    originalData: reservation,
  };
}

/**
 * Основной хук для Room Planner
 */
export function useRoomPlanner(filters: RoomPlannerFilters) {
  const { date, roomIds, activityTypes, showNowOnly } = filters;

  // Получаем события календаря
  // Важно: передаем undefined если roomIds пустой, чтобы получить все события
  const {
    data: calendarData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useCalendarEvents({
    date,
    roomId: roomIds && roomIds.length > 0 ? roomIds : undefined,
  });

  // Получаем список помещений
  const {
    data: rooms,
    isLoading: isLoadingRooms,
    error: roomsError,
  } = useRooms();

  // Обрабатываем данные
  const roomsWithActivities = useMemo<RoomWithActivities[]>(() => {
    if (!rooms || !calendarData) return [];

    const currentDate = getCurrentDate();
    const isToday = date === currentDate;

    // Преобразуем все события в Activity
    let allActivities: Activity[] = [];

    // Если фильтр типов не задан или пустой - показываем все типы
    const showAllTypes = !activityTypes || activityTypes.length === 0;

    // Schedules
    if (showAllTypes || activityTypes.includes('schedule')) {
      allActivities.push(
        ...calendarData.schedules.map(scheduleToActivity)
      );
    }

    // Rentals
    if (showAllTypes || activityTypes.includes('rental')) {
      allActivities.push(
        ...calendarData.rentals.map(rentalToActivity)
      );
    }

    // Events
    if (showAllTypes || activityTypes.includes('event')) {
      allActivities.push(
        ...calendarData.events.map(eventToActivity)
      );
    }

    // Reservations
    if (showAllTypes || activityTypes.includes('reservation')) {
      allActivities.push(
        ...calendarData.reservations.map(reservationToActivity)
      );
    }

    // Группируем по помещениям
    const activitiesByRoom = new Map<string, Activity[]>();

    for (const activity of allActivities) {
      const roomActivities = activitiesByRoom.get(activity.roomId) || [];
      roomActivities.push(activity);
      activitiesByRoom.set(activity.roomId, roomActivities);
    }

    // Фильтруем помещения
    let filteredRooms = rooms.filter(
      (room) => room.status === 'AVAILABLE'
    );

    if (roomIds && roomIds.length > 0) {
      filteredRooms = filteredRooms.filter((room) =>
        roomIds.includes(room.id)
      );
    }

    // Создаем результат
    const result: RoomWithActivities[] = filteredRooms.map((room) => {
      let activities = activitiesByRoom.get(room.id) || [];

      // Сортируем по времени начала
      activities = activities.sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );

      // Рассчитываем свободные слоты (с учётом текущего времени для сегодня)
      const freeSlots = calculateFreeSlots(
        activities.map((a) => ({
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
        })),
        '08:00',
        '22:00',
        30,
        isToday ? getCurrentTime() : undefined
      );

      // Находим текущую активность (если сегодня)
      let currentActivity: Activity | undefined;
      let isOccupiedNow = false;

      if (isToday) {
        currentActivity = activities.find((a) =>
          isActivityCurrentlyActive(a.date, a.startTime, a.endTime, currentDate)
        );
        isOccupiedNow = !!currentActivity;
      }

      // Есть ли активности на этот день (не отменённые)
      const hasActivities = activities.filter(a => a.status !== 'CANCELLED').length > 0;

      return {
        room,
        activities,
        freeSlots,
        currentActivity,
        isOccupiedNow,
        hasActivities,
        totalActivitiesCount: activities.length,
      };
    });

    // Фильтр "СЕЙЧАС" - показываем только помещения с текущими активностями
    if (showNowOnly && isToday) {
      return result.filter((r) => r.isOccupiedNow);
    }

    // Сортируем: сначала с активностями, потом по имени
    return result.sort((a, b) => {
      // Сначала занятые сейчас (если сегодня)
      if (a.isOccupiedNow !== b.isOccupiedNow) {
        return a.isOccupiedNow ? -1 : 1;
      }
      // Потом с активностями
      if (a.hasActivities !== b.hasActivities) {
        return a.hasActivities ? -1 : 1;
      }
      // Потом по количеству активностей (больше - выше)
      if (a.totalActivitiesCount !== b.totalActivitiesCount) {
        return b.totalActivitiesCount - a.totalActivitiesCount;
      }
      // Потом по имени
      return a.room.name.localeCompare(b.room.name);
    });
  }, [rooms, calendarData, date, roomIds, activityTypes, showNowOnly]);

  // Статистика
  const totalRooms = roomsWithActivities.length;
  const withActivities = roomsWithActivities.filter((r) => r.hasActivities).length;
  const occupiedNow = roomsWithActivities.filter((r) => r.isOccupiedNow).length;
  const isToday = date === getCurrentDate();

  return {
    roomsWithActivities,
    isLoading: isLoadingEvents || isLoadingRooms,
    error: eventsError || roomsError,
    // Дополнительная информация
    totalRooms,
    withActivities,      // С активностями на выбранную дату
    withoutActivities: totalRooms - withActivities,
    occupiedNow,         // Занято прямо сейчас (актуально только для сегодня)
    freeNow: totalRooms - occupiedNow,
    isToday,
  };
}

/**
 * Хук для режима "Подбор помещений"
 */
export interface SearchFilters {
  date: string;
  timeStart: string;
  timeEnd: string;
  roomId?: string;
  onlyAvailable?: boolean;
  minArea?: number;
  minCapacity?: number;
  roomType?: Room['type'];
}

export interface RoomSearchResult {
  room: Room;
  isAvailable: boolean;
  availableSlots: TimeSlot[];
  firstFreeSlot?: TimeSlot;
  activitiesCount: number;
  conflictingActivity?: Activity;
  conflictingActivities: Activity[]; // Все конфликтующие активности
}

export function useRoomSearch(filters: SearchFilters) {
  const { date, timeStart, timeEnd, roomId, onlyAvailable, minArea, minCapacity, roomType } = filters;

  const {
    roomsWithActivities,
    isLoading,
    error,
  } = useRoomPlanner({ date });

  const searchResults = useMemo<RoomSearchResult[]>(() => {
    if (!roomsWithActivities.length) return [];

    const searchStartMin = timeToMinutes(timeStart);
    const searchEndMin = timeToMinutes(timeEnd);

    return roomsWithActivities
      .filter((rwa) => {
        const room = rwa.room;

        // Фильтр по конкретному помещению
        if (roomId && room.id !== roomId) return false;

        // Фильтр по типу
        if (roomType && room.type !== roomType) return false;

        // Фильтр по площади
        if (minArea && (room.area || 0) < minArea) return false;

        // Фильтр по вместимости
        if (minCapacity && (room.capacity || 0) < minCapacity) return false;

        return true;
      })
      .map((rwa) => {
        // Находим все конфликтующие активности в указанном интервале
        const conflictingActivities = rwa.activities.filter((a) => {
          if (a.status === 'CANCELLED') return false;

          const actStart = timeToMinutes(a.startTime);
          const actEnd = timeToMinutes(a.endTime);

          // Проверяем пересечение
          return actStart < searchEndMin && actEnd > searchStartMin;
        });

        const isAvailable = conflictingActivities.length === 0;

        // Находим подходящие свободные слоты
        const availableSlots = rwa.freeSlots.filter((slot) => {
          const slotStart = timeToMinutes(slot.startTime);
          const slotEnd = timeToMinutes(slot.endTime);

          // Слот должен содержать искомый интервал или пересекаться с ним
          return slotStart <= searchStartMin && slotEnd >= searchEndMin;
        });

        return {
          room: rwa.room,
          isAvailable,
          availableSlots,
          firstFreeSlot: availableSlots[0],
          activitiesCount: rwa.totalActivitiesCount,
          conflictingActivity: conflictingActivities[0], // Для обратной совместимости
          conflictingActivities,
        };
      })
      .filter((result) => {
        // Фильтр "только доступные"
        if (onlyAvailable && !result.isAvailable) return false;
        return true;
      })
      .sort((a, b) => {
        // Сначала доступные
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1;
        }
        // Потом по количеству активностей (меньше - лучше)
        return a.activitiesCount - b.activitiesCount;
      });
  }, [roomsWithActivities, timeStart, timeEnd, roomId, onlyAvailable, minArea, minCapacity, roomType]);

  return {
    searchResults,
    isLoading,
    error,
    totalFound: searchResults.length,
    availableCount: searchResults.filter((r) => r.isAvailable).length,
  };
}

// Вспомогательная функция (дублируем для изоляции)
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// ==================== Хук для недельного режима ====================

export interface WeekActivitiesFilters {
  weekStartDate: string;
  roomIds?: string[];
  activityTypes?: ActivityType[];
}

export interface WeekActivities {
  [date: string]: Activity[];
}

/**
 * Хук для получения активностей за неделю (для недельного режима шахматки)
 * Делает 7 параллельных запросов для каждого дня недели
 */
export function useWeekActivities(filters: WeekActivitiesFilters) {
  const { weekStartDate, roomIds, activityTypes } = filters;

  // Получаем массив из 7 дат недели
  const weekDates = useMemo(() => getWeekDates(weekStartDate), [weekStartDate]);

  // Параллельные запросы для каждого дня
  const queries = useQueries({
    queries: weekDates.map((date) => ({
      queryKey: ['calendar-events', { date, roomId: roomIds }],
      queryFn: () =>
        getAllCalendarEvents({
          date,
          roomId: roomIds && roomIds.length > 0 ? roomIds : undefined,
        }),
      staleTime: 30 * 1000,
    })),
  });

  // Обрабатываем данные
  const weekActivities = useMemo<WeekActivities>(() => {
    const result: WeekActivities = {};

    // Если фильтр типов не задан или пустой - показываем все типы
    const showAllTypes = !activityTypes || activityTypes.length === 0;

    weekDates.forEach((date, index) => {
      const query = queries[index];

      if (!query.data) {
        result[date] = [];
        return;
      }

      const calendarData = query.data;
      let activities: Activity[] = [];

      // Schedules
      if (showAllTypes || activityTypes?.includes('schedule')) {
        activities.push(
          ...calendarData.schedules.map(scheduleToActivity)
        );
      }

      // Rentals
      if (showAllTypes || activityTypes?.includes('rental')) {
        activities.push(
          ...calendarData.rentals.map(rentalToActivity)
        );
      }

      // Events
      if (showAllTypes || activityTypes?.includes('event')) {
        activities.push(
          ...calendarData.events.map(eventToActivity)
        );
      }

      // Reservations
      if (showAllTypes || activityTypes?.includes('reservation')) {
        activities.push(
          ...calendarData.reservations.map(reservationToActivity)
        );
      }

      // Фильтруем отменённые и сортируем по времени
      result[date] = activities
        .filter((a) => a.status !== 'CANCELLED')
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return result;
  }, [queries, weekDates, activityTypes]);

  // Статистика загрузки
  const isLoading = queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error;

  // Общее количество событий
  const totalActivities = Object.values(weekActivities).reduce(
    (sum, activities) => sum + activities.length,
    0
  );

  return {
    weekActivities,
    weekDates,
    isLoading,
    error,
    totalActivities,
  };
}

