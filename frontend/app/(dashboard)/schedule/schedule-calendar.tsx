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
import { Calendar, Key, Star, Lock } from 'lucide-react';
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
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarResources, setCalendarResources] = useState<Array<{id: string; title: string}>>([]);
  const [scrollTime, setScrollTime] = useState<string>(() => {
    // Вычисляем начальное время прокрутки
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes() - 30;

    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }

    if (hours < 8) {
      hours = 8;
      minutes = 0;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  });

  // Функция для прокрутки к текущему времени
  const scrollToCurrentTime = useCallback(() => {
    if (!calendarRef.current) return;

    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes() - 30;

    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }

    if (hours < 8) {
      hours = 8;
      minutes = 0;
    }

    // Обновляем scrollTime для автопрокрутки
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    setScrollTime(timeString);

    // Дополнительно используем прямой DOM scroll для кнопки "Сейчас"
    const calendarApi = calendarRef.current.getApi();
    const calendarElement = calendarApi.el;
    if (calendarElement) {
      const allElements = calendarElement.querySelectorAll('*');
      let scrollContainer = null;

      for (const el of allElements) {
        if (el.scrollHeight > el.clientHeight + 5) {
          const className = el.className;
          if (className && (className.includes('scroller') || className.includes('timegrid') || className.includes('time-cols'))) {
            scrollContainer = el;
            break;
          }
        }
      }

      if (!scrollContainer) {
        // Если не нашли специфичный, берем первый scrollable
        for (const el of allElements) {
          if (el.scrollHeight > el.clientHeight + 5) {
            scrollContainer = el;
            break;
          }
        }
      }

      if (scrollContainer) {
        const totalMinutesFromStart = (hours * 60 + minutes) - (8 * 60);
        const slots = scrollContainer.querySelectorAll('.fc-timegrid-slot');
        if (slots.length > 0) {
          const targetSlotIndex = Math.floor(totalMinutesFromStart / 30);
          if (slots[targetSlotIndex]) {
            slots[targetSlotIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }
  }, []);

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

  // Обновление времени прокрутки при смене режима
  useEffect(() => {
    if (!isLoading && calendarRef.current) {
      // Даем календарю время отрендериться
      const timer = setTimeout(() => {
        scrollToCurrentTime();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentView, scrollToCurrentTime, isLoading]);

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

  // Calculate filtered resources
  const filteredResources = useMemo(() => {
    if (!rooms) return [];

    const allResources = rooms.map((room) => ({
      id: room.id,
      title: `${room.name}${room.number ? ` (${room.number})` : ''}`,
    }));

    // Если не в режиме "День", показываем все помещения
    if (currentView !== 'resourceTimeGridDay') {
      return allResources;
    }

    // Получаем активную дату из календаря API
    let activeDate = currentDate;
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      activeDate = calendarApi.getDate();
    }

    // Фильтруем помещения с событиями на текущую дату
    const currentDateStr = activeDate.toISOString().split('T')[0];
    const occupiedRoomIds = new Set<string>();

    console.log('🔍 Filtering rooms for date:', currentDateStr);
    console.log('📊 Data counts:', {
      schedules: schedules.length,
      rentals: rentals.length,
      events: eventItems.length,
      reservations: reservations.length
    });

    // Логируем даты из данных для диагностики
    const scheduleDates = schedules.map(s => s.date?.split('T')[0]).filter(Boolean);
    const rentalDates = rentals.map(r => r.date?.split('T')[0]).filter(Boolean);
    const eventDates = eventItems.map(e => e.date?.split('T')[0]).filter(Boolean);
    const reservationDates = reservations.map(r => r.date?.split('T')[0]).filter(Boolean);

    const allDates = [...new Set([...scheduleDates, ...rentalDates, ...eventDates, ...reservationDates])].sort();
    console.log('📅 Available dates in data:', allDates);

    // Логируем события на текущую дату (для диагностики)
    const eventsOnDate = eventItems.filter(e => e.date?.split('T')[0] === currentDateStr);
    const eventsOnDateWithRoom = eventsOnDate.filter(e => e.roomId);
    const eventsOnDateWithoutRoom = eventsOnDate.filter(e => !e.roomId);
    console.log(`📌 Events on ${currentDateStr}:`, {
      total: eventsOnDate.length,
      withRoom: eventsOnDateWithRoom.length,
      withoutRoom: eventsOnDateWithoutRoom.length,
      withoutRoomList: eventsOnDateWithoutRoom.map(e => ({ name: e.name, id: e.id }))
    });

    // Детальная проверка всех events за дату
    console.log(`🔍 Detailed events for ${currentDateStr}:`, eventsOnDate.map(e => ({
      id: e.id,
      name: e.name,
      roomId: e.roomId,
      room: e.room,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime
    })));

    // Проверка: какие помещения существуют в справочнике
    console.log('🏢 Available rooms:', allResources.map(r => ({ id: r.id, title: r.title })));

    // Проверяем schedules
    schedules.forEach((schedule) => {
      if (schedule.date) {
        const scheduleDateStr = schedule.date.split('T')[0];
        if (scheduleDateStr === currentDateStr) {
          if (schedule.roomId) {
            console.log('✅ Schedule match:', schedule.roomId, scheduleDateStr);
            occupiedRoomIds.add(schedule.roomId);
          } else {
            console.log('⚠️ Schedule without roomId:', scheduleDateStr, schedule);
          }
        }
      }
    });

    // Проверяем rentals
    rentals.forEach((rental) => {
      if (rental.date) {
        const rentalDateStr = rental.date.split('T')[0];
        if (rentalDateStr === currentDateStr) {
          if (rental.roomId) {
            console.log('✅ Rental match:', rental.roomId, rentalDateStr);
            occupiedRoomIds.add(rental.roomId);
          } else {
            console.log('⚠️ Rental without roomId:', rentalDateStr, rental);
          }
        }
      }
    });

    // Проверяем events
    eventItems.forEach((event) => {
      if (event.date) {
        const eventDateStr = event.date.split('T')[0];
        if (eventDateStr === currentDateStr) {
          if (event.roomId) {
            console.log('✅ Event match:', event.roomId, eventDateStr);
            occupiedRoomIds.add(event.roomId);
          } else {
            console.log('⚠️ Event without roomId:', eventDateStr, event);
          }
        }
      }
    });

    // Проверяем reservations
    reservations.forEach((reservation) => {
      if (reservation.date) {
        const reservationDateStr = reservation.date.split('T')[0];
        if (reservationDateStr === currentDateStr) {
          if (reservation.roomId) {
            console.log('✅ Reservation match:', reservation.roomId, reservationDateStr);
            occupiedRoomIds.add(reservation.roomId);
          } else {
            console.log('⚠️ Reservation without roomId:', reservationDateStr, reservation);
          }
        }
      }
    });

    console.log('🏢 Occupied room IDs:', Array.from(occupiedRoomIds));

    const filtered = allResources.filter(r => occupiedRoomIds.has(r.id));

    return filtered.length > 0 ? filtered : allResources;
  }, [rooms, currentView, currentDate, schedules, rentals, eventItems, reservations]);

  // Update calendar resources state when filtered resources change
  useEffect(() => {
    setCalendarResources(filteredResources);
  }, [filteredResources]);


  // useEffect(() => {
  //   console.log('Events for FullCalendar:', calendarEvents);
  // }, [calendarEvents]);

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

    // Extract resource (room) ID if available
    const roomId = selectInfo.resource?.id;

    onDateSelect({ date, startTime, endTime, roomId });

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

  const handleViewChange = (info: any) => {
    setCurrentView(info.view.type);
    // Обновляем текущую дату календаря для фильтрации помещений
    if (info.view.currentStart) {
      setCurrentDate(new Date(info.view.currentStart));
    }
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const eventType = eventInfo.event.extendedProps.type as CalendarEventType;
    const eventData = eventInfo.event.extendedProps.data;
    const isMonthView = currentView === 'dayGridMonth';

    // Определяем иконку в зависимости от типа события
    let IconComponent;
    switch (eventType) {
      case 'schedule':
        IconComponent = Calendar;
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
        IconComponent = Calendar;
    }

    // Генерируем подробное описание для тултипа
    const getEventTooltip = () => {
      if (eventType === 'schedule') {
        const schedule = eventData as Schedule;
        return `${eventInfo.timeText}
Тип: ${schedule.type === 'GROUP_CLASS' ? 'Групповое' : schedule.type === 'INDIVIDUAL_CLASS' ? 'Индивидуальное' : schedule.type === 'OPEN_CLASS' ? 'Открытое' : 'Мероприятие'}
Группа: ${schedule.group?.name || 'Индивидуальное'}
Преподаватель: ${schedule.teacher ? `${schedule.teacher.lastName} ${schedule.teacher.firstName}` : '-'}
Помещение: ${schedule.room?.name || '-'}
Статус: ${schedule.status === 'PLANNED' ? 'Запланировано' : schedule.status === 'ONGOING' ? 'Идет' : schedule.status === 'COMPLETED' ? 'Завершено' : 'Отменено'}`;
      } else if (eventType === 'rental') {
        const rental = eventData as Rental;
        return `${eventInfo.timeText}
Тип: ${rental.eventType}
Клиент: ${rental.clientName}
Помещение: ${rental.room?.name || '-'}
Статус: ${rental.status === 'PLANNED' ? 'Запланировано' : rental.status === 'ONGOING' ? 'Идет' : rental.status === 'COMPLETED' ? 'Завершено' : 'Отменено'}`;
      } else if (eventType === 'event') {
        const event = eventData as Event;
        return `${eventInfo.timeText}
Мероприятие: ${event.name}
Тип: ${event.eventType?.name || '-'}
Помещение: ${event.room?.name || '-'}
Статус: ${event.status === 'PLANNED' ? 'Запланировано' : event.status === 'ONGOING' ? 'Идет' : event.status === 'COMPLETED' ? 'Завершено' : 'Отменено'}`;
      } else {
        const reservation = eventData as Reservation;
        return `${eventInfo.timeText}
Забронировано: ${reservation.reservedBy}
Помещение: ${reservation.room?.name || '-'}`;
      }
    };

    // Компактное отображение для режима месяца
    if (isMonthView) {
      return (
        <div
          className="fc-event-main-frame fc-event-month-compact"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '1px 3px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: '0.7rem',
            lineHeight: 1.2
          }}
          title={getEventTooltip()}
        >
          <IconComponent size={10} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 500, marginRight: '2px' }}>{eventInfo.timeText}</span>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {eventInfo.event.title.split('\n')[0]}
          </span>
        </div>
      );
    }

    // Обычное отображение для других режимов
    return (
      <div className="fc-event-main-frame" style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', padding: '2px' }}>
        <IconComponent size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-line', lineHeight: 1.3, fontSize: '0.875rem' }}>
          <div className="fc-event-time">{eventInfo.timeText}</div>
          <div className="fc-event-title">{eventInfo.event.title}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-calendar">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, resourceTimeGridPlugin]}
        initialView="resourceTimeGridDay"
        locale={ruLocale}
        headerToolbar={{
          left: 'prev,next today scrollToNow',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay,listWeek',
        }}
        customButtons={{
          scrollToNow: {
            text: 'Сейчас',
            click: scrollToCurrentTime,
          },
        }}
        buttonText={{
          today: 'Сегодня',
          month: 'Месяц',
          week: 'Неделя',
          resourceTimeGridDay: 'День',
          list: 'Список',
        }}
        resources={calendarResources}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        scrollTime={scrollTime}
        allDaySlot={false}
        height={700}
        events={calendarEvents}
        eventClick={handleEventClick}
        select={handleSelect}
        editable={true}
        eventDrop={handleEventDropOrResize}
        eventResize={handleEventDropOrResize}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={5}
        weekends={true}
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        expandRows={true}
        stickyHeaderDates={true}
        nowIndicator={true}
        resourceAreaHeaderContent="Помещения"
        datesSet={handleViewChange}
        eventContent={renderEventContent}
        moreLinkText={(num) => `+${num} ещё`}
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

        .schedule-calendar .fc-scrollToNow-button {
          background-color: hsl(var(--muted));
          border-color: hsl(var(--border));
          color: hsl(var(--muted-foreground));
        }

        .schedule-calendar .fc-scrollToNow-button:hover {
          background-color: hsl(var(--muted) / 0.8);
          border-color: hsl(var(--border));
          color: hsl(var(--foreground));
        }

        .schedule-calendar .fc-event {
          cursor: pointer;
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 0.875rem;
        }

        .schedule-calendar .fc-event-title {
          white-space: pre-line;
          line-height: 1.3;
        }

        .schedule-calendar .fc-event:hover {
          opacity: 0.85;
        }

        .schedule-calendar .fc-timegrid-slot {
          height: 3em;
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

        /* Стили для режима месяца - убираем фон и делаем компактным */
        .schedule-calendar .fc-daygrid-event {
          background-color: transparent !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 1px !important;
        }

        .schedule-calendar .fc-daygrid-event .fc-event-main {
          padding: 0 !important;
        }

        .schedule-calendar .fc-daygrid-event .fc-event-month-compact {
          color: inherit !important;
        }

        /* Цвета иконок и текста для разных типов событий в режиме месяца */
        .schedule-calendar .fc-daygrid-event[style*="background-color: rgb(59, 130, 246)"] .fc-event-month-compact,
        .schedule-calendar .fc-daygrid-event[style*="background-color:#3b82f6"] .fc-event-month-compact {
          color: #3b82f6 !important; /* blue - занятия группы */
        }

        .schedule-calendar .fc-daygrid-event[style*="background-color: rgb(16, 185, 129)"] .fc-event-month-compact,
        .schedule-calendar .fc-daygrid-event[style*="background-color:#10b981"] .fc-event-month-compact {
          color: #10b981 !important; /* green - индивидуальные */
        }

        .schedule-calendar .fc-daygrid-event[style*="background-color: rgb(245, 158, 11)"] .fc-event-month-compact,
        .schedule-calendar .fc-daygrid-event[style*="background-color:#f59e0b"] .fc-event-month-compact {
          color: #f59e0b !important; /* amber - открытые/резервации */
        }

        .schedule-calendar .fc-daygrid-event[style*="background-color: rgb(139, 92, 246)"] .fc-event-month-compact,
        .schedule-calendar .fc-daygrid-event[style*="background-color:#8b5cf6"] .fc-event-month-compact {
          color: #8b5cf6 !important; /* purple - мероприятия */
        }

        .schedule-calendar .fc-daygrid-event[style*="background-color: rgb(220, 38, 38)"] .fc-event-month-compact,
        .schedule-calendar .fc-daygrid-event[style*="background-color:#dc2626"] .fc-event-month-compact {
          color: #dc2626 !important; /* red - аренда */
        }

        .schedule-calendar .fc-daygrid-event[style*="background-color: rgb(156, 163, 175)"] .fc-event-month-compact,
        .schedule-calendar .fc-daygrid-event[style*="background-color:#9ca3af"] .fc-event-month-compact {
          color: #9ca3af !important; /* gray - завершено */
        }

        .schedule-calendar .fc-daygrid-event[style*="background-color: rgb(239, 68, 68)"] .fc-event-month-compact,
        .schedule-calendar .fc-daygrid-event[style*="background-color:#ef4444"] .fc-event-month-compact {
          color: #ef4444 !important; /* red - отменено */
        }

        /* Стили для ссылки "+N ещё" */
        .schedule-calendar .fc-daygrid-more-link {
          font-size: 0.7rem;
          font-weight: 500;
          color: hsl(var(--primary));
          text-decoration: none;
          padding: 1px 3px;
          margin: 0;
        }

        .schedule-calendar .fc-daygrid-more-link:hover {
          text-decoration: underline;
          color: hsl(var(--primary) / 0.8);
        }

        /* Попап со списком событий */
        .schedule-calendar .fc-popover {
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .schedule-calendar .fc-popover-header {
          background-color: hsl(var(--muted));
          border-bottom: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          font-weight: 500;
        }

        .schedule-calendar .fc-popover-body {
          padding: 0.25rem 0;
        }

        .schedule-calendar .fc-popover .fc-daygrid-event {
          margin: 0 0.5rem 0.25rem !important;
        }

        /* Увеличиваем высоту ячеек для вмещения большего количества событий */
        .schedule-calendar .fc-daygrid-day-frame {
          min-height: 100px;
        }

        .schedule-calendar .fc-daygrid-day-events {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
