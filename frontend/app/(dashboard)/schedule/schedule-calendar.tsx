'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import type { EventClickArg, EventInput, EventContentArg } from '@fullcalendar/core';
import ruLocale from '@fullcalendar/core/locales/ru';
import { Schedule } from '@/lib/api/schedules';
import { Rental } from '@/lib/api/rentals';
import { Event } from '@/lib/api/events';
import { Reservation } from '@/lib/api/reservations';
import { useRooms } from '@/hooks/use-rooms';
import { Calendar as CalendarIcon, Key, Star, Lock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ru } from 'date-fns/locale';
import './schedule-calendar.css';

type CalendarEventType = 'schedule' | 'rental' | 'event' | 'reservation';

interface ScheduleCalendarProps {
  schedules: Schedule[];
  rentals: Rental[];
  events: Event[];
  reservations: Reservation[];
  isLoading: boolean;
  onEventClick: (eventId: string, eventType: CalendarEventType) => void;
  onDateSelect: (dateRange: { date: string; startTime: string; endTime: string; roomId?: string }) => void;
  onEventDrop: (
    eventId: string,
    eventType: CalendarEventType,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    newRoomId?: string
  ) => void;
}

const getEventColor = (type: Schedule['type']) => {
  switch (type) {
    case 'GROUP_CLASS':
      return '#3b82f6'; // blue
    case 'INDIVIDUAL_CLASS':
      return '#10b981'; // green
    case 'OPEN_CLASS':
      return '#f59e0b'; // amber
    case 'EVENT':
      return '#8b5cf6'; // purple
    default:
      return '#6b7280'; // gray
  }
};

const getScheduleTitle = (schedule: Schedule, hideRoom: boolean = false) => {
  const teacher = schedule.teacher
    ? `${schedule.teacher.lastName} ${schedule.teacher.firstName[0]}.`
    : '';
  const room = schedule.room ? schedule.room.name : '';
  const group = schedule.group ? schedule.group.name : 'Индивидуальное';

  const lines = [group];
  if (teacher) lines.push(teacher);
  if (!hideRoom && room) lines.push(room);

  return lines.join('\n');
};

const getRentalTitle = (rental: Rental, hideRoom: boolean = false) => {
  const room = rental.room ? rental.room.name : '';
  const client = rental.clientName;
  const eventType = rental.eventType;

  const lines = [eventType, client];
  if (!hideRoom && room) lines.push(room);

  return lines.join('\n');
};

const getEventItemTitle = (event: Event, hideRoom: boolean = false) => {
  return event.name;
};

const getReservationTitle = (reservation: Reservation, hideRoom: boolean = false) => {
  const room = reservation.room ? reservation.room.name : '';

  const lines = [reservation.reservedBy];
  if (!hideRoom && room) lines.push(room);

  return lines.join('\n');
};

export function ScheduleCalendar({ schedules, rentals, events: eventItems, reservations, isLoading, onEventClick, onDateSelect, onEventDrop }: ScheduleCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { data: rooms } = useRooms();
  const [currentView, setCurrentView] = useState<string>('resourceTimeGridDay');
  const [currentDateRange, setCurrentDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const titleRef = useRef<HTMLDivElement>(null);
  const [titlePosition, setTitlePosition] = useState<{ top: number; left: number } | null>(null);


  // All hooks must be called before any conditional returns
  // useEffect(() => {
  //   console.log('ScheduleCalendar received schedules:', schedules);
  //   console.log('ScheduleCalendar received rentals:', rentals);
  //   console.log('ScheduleCalendar received events:', eventItems);
  //   console.log('ScheduleCalendar received reservations:', reservations);
  //   console.log('isLoading:', isLoading);
  // }, [schedules, rentals, eventItems, reservations, isLoading]);

  useEffect(() => {
    // Resize calendar when window size changes
    const handleResize = () => {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.updateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Добавляем обработчик клика на заголовок для открытия date picker
  useEffect(() => {
    if (!calendarRef.current || isLoading) return;

    const timer = setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (!calendarApi) return;

      const calendarEl = (calendarRef.current as unknown as { elRef: { current: HTMLElement | null } })?.elRef?.current;
      if (!calendarEl) return;
      const titleElement = calendarEl.querySelector('.fc-toolbar-title') as HTMLElement;
      if (titleElement && titleRef.current) {
        titleElement.style.cursor = 'pointer';
        titleElement.style.userSelect = 'none';
        titleElement.style.transition = 'all 0.2s ease';
        titleElement.style.textDecoration = 'underline dashed';
        titleElement.style.textDecorationThickness = '1px';
        titleElement.style.textUnderlineOffset = '4px';

        const handleClick = () => {
          // Вычисляем позицию заголовка для открытия Popover
          const rect = titleElement.getBoundingClientRect();
          setTitlePosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + rect.width / 2 + window.scrollX
          });
          setIsDatePickerOpen(true);
          setSelectedDate(calendarApi.getDate());
        };

        const handleMouseEnter = () => {
          titleElement.style.color = 'hsl(var(--primary))';
        };

        const handleMouseLeave = () => {
          titleElement.style.color = '';
        };

        titleElement.addEventListener('click', handleClick);
        titleElement.addEventListener('mouseenter', handleMouseEnter);
        titleElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
          titleElement.removeEventListener('click', handleClick);
          titleElement.removeEventListener('mouseenter', handleMouseEnter);
          titleElement.removeEventListener('mouseleave', handleMouseLeave);
        };
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [currentView, isLoading]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(date);
      setSelectedDate(date);
      setIsDatePickerOpen(false);
    }
  };

  // Prepare events data (always, not conditionally)
  const calendarEvents = useMemo(() => {
    const hideRoom = currentView === 'resourceTimeGridDay';
    const now = new Date();

    const scheduleEvents: EventInput[] = schedules.map((schedule) => {
    // Extract time from the datetime string (format: "1970-01-01T10:00:00.000Z")
    const startTime = schedule.startTime.includes('T')
      ? schedule.startTime.split('T')[1].slice(0, 8)
      : schedule.startTime;
    const endTime = schedule.endTime.includes('T')
      ? schedule.endTime.split('T')[1].slice(0, 8)
      : schedule.endTime;

    // Extract date (format: "2025-11-16T00:00:00.000Z")
    const date = schedule.date.split('T')[0];

    // Проверяем, прошло ли событие
    const eventEnd = new Date(`${date}T${endTime}`);
    const isPast = eventEnd < now;

    // Определяем цвет в зависимости от статуса
    let backgroundColor = getEventColor(schedule.type);
    let className = 'schedule-status-' + schedule.status.toLowerCase();

    // Если событие завершено или уже прошло
    if (schedule.status === 'COMPLETED' || (isPast && schedule.status !== 'CANCELLED')) {
      backgroundColor = '#9ca3af'; // gray
    } else if (schedule.status === 'CANCELLED') {
      backgroundColor = '#ef4444'; // red
    }

    return {
      id: `schedule-${schedule.id}`,
      title: getScheduleTitle(schedule, hideRoom),
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: backgroundColor,
      borderColor: backgroundColor,
      resourceId: schedule.roomId,
      className: className,
      extendedProps: {
        type: 'schedule',
        data: schedule,
      },
    };
  });

  const rentalEvents: EventInput[] = rentals.map((rental) => {
    // Extract time from datetime string
    const startTime = rental.startTime.includes('T')
      ? rental.startTime.split('T')[1].slice(0, 8)
      : rental.startTime + ':00';
    const endTime = rental.endTime.includes('T')
      ? rental.endTime.split('T')[1].slice(0, 8)
      : rental.endTime + ':00';

    // Extract date
    const date = rental.date.split('T')[0];

    // Проверяем, прошло ли событие
    const eventEnd = new Date(`${date}T${endTime}`);
    const isPast = eventEnd < now;

    // Определяем цвет в зависимости от статуса
    let backgroundColor = '#dc2626'; // red for rentals
    let className = 'rental-status-' + rental.status.toLowerCase();

    // Если событие завершено или уже прошло
    if (rental.status === 'COMPLETED' || (isPast && rental.status !== 'CANCELLED')) {
      backgroundColor = '#9ca3af'; // gray
    } else if (rental.status === 'CANCELLED') {
      backgroundColor = '#ef4444'; // red (lighter than default)
    }

    return {
      id: `rental-${rental.id}`,
      title: getRentalTitle(rental, hideRoom),
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: backgroundColor,
      borderColor: backgroundColor,
      resourceId: rental.roomId,
      className: className,
      extendedProps: {
        type: 'rental',
        data: rental,
      },
    };
  });

  const eventEvents: EventInput[] = eventItems.map((event) => {
    // Extract time from datetime string
    const startTime = event.startTime.includes('T')
      ? event.startTime.split('T')[1].slice(0, 8)
      : event.startTime + ':00';
    const endTime = event.endTime.includes('T')
      ? event.endTime.split('T')[1].slice(0, 8)
      : event.endTime + ':00';

    // Extract date
    const date = event.date.split('T')[0];

    // Проверяем, прошло ли событие
    const eventEnd = new Date(`${date}T${endTime}`);
    const isPast = eventEnd < now;

    // Use color from event type if available
    let eventColor = event.eventType?.color || '#8b5cf6'; // purple default
    let className = 'event-status-' + event.status.toLowerCase();

    // Если событие завершено или уже прошло
    if (event.status === 'COMPLETED' || (isPast && event.status !== 'CANCELLED')) {
      eventColor = '#9ca3af'; // gray
    } else if (event.status === 'CANCELLED') {
      eventColor = '#ef4444'; // red
    }

    return {
      id: `event-${event.id}`,
      title: getEventItemTitle(event, hideRoom),
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: eventColor,
      borderColor: eventColor,
      resourceId: event.roomId,
      className: className,
      extendedProps: {
        type: 'event',
        data: event,
      },
    };
  });

  const reservationEvents: EventInput[] = reservations.map((reservation) => {
    // Extract time from datetime string
    const startTime = reservation.startTime.includes('T')
      ? reservation.startTime.split('T')[1].slice(0, 8)
      : reservation.startTime + ':00';
    const endTime = reservation.endTime.includes('T')
      ? reservation.endTime.split('T')[1].slice(0, 8)
      : reservation.endTime + ':00';

    // Extract date
    const date = reservation.date.split('T')[0];

    return {
      id: `reservation-${reservation.id}`,
      title: getReservationTitle(reservation, hideRoom),
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: '#f59e0b', // amber for reservations
      borderColor: '#f59e0b',
      resourceId: reservation.roomId,
      extendedProps: {
        type: 'reservation',
        data: reservation,
      },
    };
  });

    return [
      ...scheduleEvents,
      ...rentalEvents,
      ...eventEvents,
      ...reservationEvents,
    ];
  }, [schedules, rentals, eventItems, reservations, currentView]);

  // useEffect(() => {
  //   console.log('Events for FullCalendar:', calendarEvents);
  // }, [calendarEvents]);

  // Prepare resources from rooms - показываем только помещения с активностями в текущем диапазоне дат
  const resources = useMemo(() => {
    if (!rooms) return [];

    // Собираем все уникальные roomId из событий, попадающих в текущий диапазон
    const usedRoomIds = new Set<string>();

    calendarEvents.forEach(event => {
      // Фильтруем события по текущему диапазону дат
      if (currentDateRange && event.start && event.resourceId) {
        // DateInput может быть string | number | Date | number[], проверяем что это не массив
        if (Array.isArray(event.start)) return;
        const eventStart = new Date(event.start);
        if (eventStart >= currentDateRange.start && eventStart < currentDateRange.end) {
          usedRoomIds.add(event.resourceId);
        }
      } else if (!currentDateRange && event.resourceId) {
        // Если диапазон еще не установлен, показываем все помещения с событиями
        usedRoomIds.add(event.resourceId);
      }
    });

    // Фильтруем только помещения с активностями
    return rooms
      .filter(room => usedRoomIds.has(room.id))
      .map((room) => ({
        id: room.id,
        title: `${room.name}${room.number ? ` (${room.number})` : ''}`,
      }));
  }, [rooms, calendarEvents, currentDateRange]);

  // Conditional rendering comes AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  const handleEventClick = useCallback((info: EventClickArg) => {
    const eventType = info.event.extendedProps.type as CalendarEventType;
    const eventData = info.event.extendedProps.data;
    const eventId = eventData.id;
    onEventClick(eventId, eventType);
  }, [onEventClick]);

  const handleSelect = useCallback((selectInfo: any) => {
    const startDate = new Date(selectInfo.start);
    const endDate = new Date(selectInfo.end);

    const date = startDate.toISOString().split('T')[0];
    const startTime = startDate.toTimeString().slice(0, 5); // HH:mm
    const endTime = endDate.toTimeString().slice(0, 5); // HH:mm

    // Extract resource (room) ID if available
    const roomId = selectInfo.resource?.id;

    onDateSelect({ date, startTime, endTime, roomId });

    // Unselect the time range
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  }, [onDateSelect]);

  const handleEventDropOrResize = useCallback((info: any) => {
    const eventType = info.event.extendedProps.type as CalendarEventType;
    const eventData = info.event.extendedProps.data;
    const eventId = eventData.id;

    const newStartDate = new Date(info.event.start);
    const newEndDate = new Date(info.event.end);

    const date = newStartDate.toISOString().split('T')[0];
    const startTime = newStartDate.toTimeString().slice(0, 5); // HH:mm
    const endTime = newEndDate.toTimeString().slice(0, 5); // HH:mm

    // Get the new resource (room) ID if event was moved to a different resource
    const newRoomId = info.event.getResources?.()?.[0]?.id || info.event._def?.resourceIds?.[0];

    onEventDrop(eventId, eventType, date, startTime, endTime, newRoomId);
  }, [onEventDrop]);

  const handleViewChange = useCallback((info: any) => {
    setCurrentView(info.view.type);
    setCurrentDateRange({
      start: info.start,
      end: info.end,
    });
  }, []);

  const renderEventContent = useCallback((eventInfo: EventContentArg) => {
    const eventType = eventInfo.event.extendedProps.type as CalendarEventType;

    // Определяем иконку в зависимости от типа события
    let IconComponent;
    switch (eventType) {
      case 'schedule':
        IconComponent = CalendarIcon;
        break;
      case 'rental':
        IconComponent = Key;
        break;
      case 'event':
        IconComponent = Star;
        break;
      case 'reservation':
        IconComponent = Lock;
        break;
      default:
        IconComponent = CalendarIcon;
    }

    // Создаём полный текст для tooltip
    const tooltipText = `${eventInfo.timeText}\n${eventInfo.event.title}`;

    return (
      <div
        className="fc-event-main-frame"
        style={{ display: 'flex', alignItems: 'flex-start', gap: '3px', padding: '1px 3px' }}
        title={tooltipText}
      >
        <IconComponent size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: 'pre-line',
          lineHeight: 1.2,
          fontSize: '0.7rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          <div className="fc-event-time" style={{ fontSize: '0.7rem' }}>{eventInfo.timeText}</div>
          <div className="fc-event-title" style={{
            fontSize: '0.7rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>{eventInfo.event.title}</div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="schedule-calendar h-full" ref={titleRef}>
      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <PopoverTrigger asChild>
          <div style={{
            position: 'absolute',
            top: titlePosition ? `${titlePosition.top}px` : '50%',
            left: titlePosition ? `${titlePosition.left}px` : '50%',
            transform: 'translate(-50%, 0)',
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 9999
          }} />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="center"
          side="bottom"
          sideOffset={8}
          style={{ zIndex: 10000 }}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            captionLayout="dropdown"
            fromYear={2020}
            toYear={2030}
            initialFocus
            locale={ru}
          />
        </PopoverContent>
      </Popover>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, resourceTimeGridPlugin]}
        initialView="resourceTimeGridDay"
        locale={ruLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay,listWeek',
        }}
        buttonText={{
          today: 'Сегодня',
          month: 'Месяц',
          week: 'Неделя',
          resourceTimeGridDay: 'День',
          list: 'Список',
        }}
        resources={resources}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        height="100%"
        events={calendarEvents}
        eventClick={handleEventClick}
        select={handleSelect}
        editable={true}
        eventDrop={handleEventDropOrResize}
        eventResize={handleEventDropOrResize}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        expandRows={true}
        stickyHeaderDates={true}
        nowIndicator={true}
        resourceAreaHeaderContent="Помещения"
        datesSet={handleViewChange}
        eventContent={renderEventContent}
      />

      <style jsx global>{`
        .schedule-calendar {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-button-active-border-color: hsl(var(--primary) / 0.8);
          --fc-event-text-color: white;
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: hsl(var(--muted));
          --fc-today-bg-color: hsl(var(--accent));
        }

        .schedule-calendar .fc {
          font-family: inherit;
        }

        .schedule-calendar .fc-theme-standard td,
        .schedule-calendar .fc-theme-standard th {
          border-color: var(--fc-border-color);
        }

        .schedule-calendar .fc-button {
          text-transform: capitalize;
          font-weight: 400;
          font-size: 0.875rem;
          padding: 0.375rem 0.75rem;
          height: auto;
        }

        /* Неактивные кнопки - серые */
        .schedule-calendar .fc-button:not(.fc-button-active) {
          background-color: hsl(var(--muted));
          border-color: hsl(var(--border));
          color: hsl(var(--muted-foreground));
        }

        .schedule-calendar .fc-button:not(.fc-button-active):hover {
          background-color: hsl(var(--muted) / 0.8);
          border-color: hsl(var(--border));
          color: hsl(var(--foreground));
        }

        /* Активные кнопки - черные */
        .schedule-calendar .fc-button-active {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        .schedule-calendar .fc-button-active:hover {
          background-color: hsl(var(--primary) / 0.9);
          border-color: hsl(var(--primary) / 0.9);
        }

        /* Кнопки навигации (назад/вперед) - серые */
        .schedule-calendar .fc-prev-button,
        .schedule-calendar .fc-next-button {
          background-color: hsl(var(--muted));
          border-color: hsl(var(--border));
          color: hsl(var(--muted-foreground));
        }

        .schedule-calendar .fc-prev-button:hover,
        .schedule-calendar .fc-next-button:hover {
          background-color: hsl(var(--muted) / 0.8);
          border-color: hsl(var(--border));
          color: hsl(var(--foreground));
        }

        .schedule-calendar .fc-toolbar-chunk {
          display: flex;
          gap: 0.25rem;
        }

        .schedule-calendar .fc-event {
          cursor: pointer;
          border-radius: 3px;
          padding: 1px 2px;
          font-size: 0.7rem;
        }

        .schedule-calendar .fc-event-title {
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .schedule-calendar .fc-event-time {
          font-size: 0.7rem;
          line-height: 1.2;
        }

        .schedule-calendar .fc-event:hover {
          opacity: 0.85;
        }

        .schedule-calendar .fc-timegrid-slot {
          height: auto !important;
          min-height: 1em !important;
        }

        .schedule-calendar .fc-col-header-cell {
          background-color: var(--fc-neutral-bg-color);
          font-weight: 500;
          padding: 0.375rem 0.5rem;
          font-size: 0.875rem;
        }

        .schedule-calendar .fc-resource-timeline-divider,
        .schedule-calendar .fc-datagrid-cell-cushion {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .schedule-calendar .fc-daygrid-day.fc-day-today,
        .schedule-calendar .fc-timegrid-col.fc-day-today {
          background-color: var(--fc-today-bg-color) !important;
        }

        .schedule-calendar .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .schedule-calendar .fc-scrollgrid {
          border-radius: 0.5rem;
          overflow: hidden;
        }

        /* Стили для статусов событий */
        .schedule-calendar .event-status-completed,
        .schedule-calendar .schedule-status-completed,
        .schedule-calendar .rental-status-completed {
          /* Завершенные события - серый цвет уже установлен в backgroundColor */
        }

        .schedule-calendar .event-status-cancelled,
        .schedule-calendar .schedule-status-cancelled,
        .schedule-calendar .rental-status-cancelled {
          /* Отмененные события - штриховка косыми линиями */
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 5px,
            rgba(0, 0, 0, 0.15) 5px,
            rgba(0, 0, 0, 0.15) 10px
          ) !important;
        }

        .schedule-calendar .event-status-ongoing,
        .schedule-calendar .schedule-status-ongoing,
        .schedule-calendar .rental-status-ongoing {
          /* Текущие события - обычный вид */
        }

        .schedule-calendar .event-status-planned,
        .schedule-calendar .schedule-status-planned,
        .schedule-calendar .rental-status-planned {
          /* Запланированные события - обычный вид */
        }

        /* Отключаем внутренний скролл календаря */
        .schedule-calendar .fc-scroller,
        .schedule-calendar .fc-scroller-liquid-absolute {
          overflow: hidden !important;
        }

        /* Растягиваем таблицу на всю высоту */
        .schedule-calendar .fc-timegrid-body {
          height: 100% !important;
        }

        .schedule-calendar .fc-timegrid-slots,
        .schedule-calendar .fc-timegrid-cols {
          height: 100% !important;
        }

        /* Равномерно распределяем слоты по высоте */
        .schedule-calendar .fc-timegrid-slots table {
          height: 100% !important;
        }

        .schedule-calendar .fc-timegrid-slots tbody {
          height: 100% !important;
        }

        /* Каждый слот занимает равную часть высоты (28 слотов для 14 часов по 30 мин) */
        .schedule-calendar .fc-timegrid-slot {
          height: calc(100% / 28) !important;
        }
      `}</style>
    </div>
  );
}
