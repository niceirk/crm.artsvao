'use client';

import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import ruLocale from '@fullcalendar/core/locales/ru';
import { Schedule } from '@/lib/api/schedules';
import { Rental } from '@/lib/api/rentals';
import { Event } from '@/lib/api/events';
import { Reservation } from '@/lib/api/reservations';
import { useRooms } from '@/hooks/use-rooms';
import './schedule-calendar.css';

type CalendarEventType = 'schedule' | 'rental' | 'event' | 'reservation';

interface ScheduleCalendarProps {
  schedules: Schedule[];
  rentals: Rental[];
  events: Event[];
  reservations: Reservation[];
  isLoading: boolean;
  onEventClick: (eventId: string, eventType: CalendarEventType) => void;
  onDateSelect: (dateRange: { date: string; startTime: string; endTime: string }) => void;
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

const getScheduleTitle = (schedule: Schedule) => {
  // Extract time from datetime string (format: "1970-01-01T10:00:00.000Z" or "10:00:00")
  const startTime = schedule.startTime.includes('T')
    ? schedule.startTime.split('T')[1].slice(0, 5)
    : schedule.startTime.slice(0, 5);
  const endTime = schedule.endTime.includes('T')
    ? schedule.endTime.split('T')[1].slice(0, 5)
    : schedule.endTime.slice(0, 5);
  const time = `${startTime}-${endTime}`;

  const teacher = schedule.teacher
    ? `${schedule.teacher.lastName} ${schedule.teacher.firstName[0]}.`
    : '';
  const room = schedule.room ? schedule.room.name : '';
  const group = schedule.group ? schedule.group.name : 'Индивидуальное';

  return `${time} | ${group} | ${teacher} | ${room}`;
};

const getRentalTitle = (rental: Rental) => {
  const startTime = rental.startTime.includes('T')
    ? rental.startTime.split('T')[1].slice(0, 5)
    : rental.startTime.slice(0, 5);
  const endTime = rental.endTime.includes('T')
    ? rental.endTime.split('T')[1].slice(0, 5)
    : rental.endTime.slice(0, 5);
  const time = `${startTime}-${endTime}`;
  const room = rental.room ? rental.room.name : '';
  const client = rental.clientName;
  const eventType = rental.eventType;

  return `${time} | АРЕНДА: ${eventType} | ${client} | ${room}`;
};

const getEventItemTitle = (event: Event) => {
  const startTime = event.startTime.includes('T')
    ? event.startTime.split('T')[1].slice(0, 5)
    : event.startTime.slice(0, 5);
  const endTime = event.endTime.includes('T')
    ? event.endTime.split('T')[1].slice(0, 5)
    : event.endTime.slice(0, 5);
  const time = `${startTime}-${endTime}`;
  const eventTypeName = event.eventType?.name || 'Мероприятие';

  return `${time} | ${eventTypeName}: ${event.name}`;
};

const getReservationTitle = (reservation: Reservation) => {
  const startTime = reservation.startTime.includes('T')
    ? reservation.startTime.split('T')[1].slice(0, 5)
    : reservation.startTime.slice(0, 5);
  const endTime = reservation.endTime.includes('T')
    ? reservation.endTime.split('T')[1].slice(0, 5)
    : reservation.endTime.slice(0, 5);
  const time = `${startTime}-${endTime}`;
  const room = reservation.room ? reservation.room.name : '';

  return `${time} | РЕЗЕРВ: ${reservation.reservedBy} | ${room}`;
};

export function ScheduleCalendar({ schedules, rentals, events: eventItems, reservations, isLoading, onEventClick, onDateSelect, onEventDrop }: ScheduleCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { data: rooms } = useRooms();

  // All hooks must be called before any conditional returns
  useEffect(() => {
    console.log('ScheduleCalendar received schedules:', schedules);
    console.log('ScheduleCalendar received rentals:', rentals);
    console.log('ScheduleCalendar received events:', eventItems);
    console.log('ScheduleCalendar received reservations:', reservations);
    console.log('isLoading:', isLoading);
  }, [schedules, rentals, eventItems, reservations, isLoading]);

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

  // Prepare events data (always, not conditionally)
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

    return {
      id: `schedule-${schedule.id}`,
      title: getScheduleTitle(schedule),
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: getEventColor(schedule.type),
      borderColor: getEventColor(schedule.type),
      resourceId: schedule.roomId,
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

    return {
      id: `rental-${rental.id}`,
      title: getRentalTitle(rental),
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: '#dc2626', // red for rentals
      borderColor: '#dc2626',
      resourceId: rental.roomId,
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

    // Use color from event type if available
    const eventColor = event.eventType?.color || '#8b5cf6'; // purple default

    return {
      id: `event-${event.id}`,
      title: getEventItemTitle(event),
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: eventColor,
      borderColor: eventColor,
      resourceId: event.roomId,
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
      title: getReservationTitle(reservation),
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

  const calendarEvents: EventInput[] = [
    ...scheduleEvents,
    ...rentalEvents,
    ...eventEvents,
    ...reservationEvents,
  ];

  useEffect(() => {
    console.log('Events for FullCalendar:', calendarEvents);
  }, [calendarEvents]);

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

  const handleEventClick = (info: EventClickArg) => {
    const eventType = info.event.extendedProps.type as CalendarEventType;
    const eventData = info.event.extendedProps.data;
    const eventId = eventData.id;
    onEventClick(eventId, eventType);
  };

  const handleSelect = (selectInfo: any) => {
    const startDate = new Date(selectInfo.start);
    const endDate = new Date(selectInfo.end);

    const date = startDate.toISOString().split('T')[0];
    const startTime = startDate.toTimeString().slice(0, 5); // HH:mm
    const endTime = endDate.toTimeString().slice(0, 5); // HH:mm

    onDateSelect({ date, startTime, endTime });

    // Unselect the time range
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  };

  const handleEventDropOrResize = (info: any) => {
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
  };

  // Prepare resources from rooms
  const resources = rooms?.map((room) => ({
    id: room.id,
    title: `${room.name}${room.number ? ` (${room.number})` : ''}`,
  })) || [];

  return (
    <div className="schedule-calendar">
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
        height="auto"
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
          font-weight: 500;
        }

        .schedule-calendar .fc-event {
          cursor: pointer;
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 0.875rem;
        }

        .schedule-calendar .fc-event:hover {
          opacity: 0.85;
        }

        .schedule-calendar .fc-timegrid-slot {
          height: 3em;
        }

        .schedule-calendar .fc-col-header-cell {
          background-color: var(--fc-neutral-bg-color);
          font-weight: 600;
          padding: 0.5rem;
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
      `}</style>
    </div>
  );
}
