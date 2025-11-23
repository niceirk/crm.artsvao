'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateSchedule } from '@/hooks/use-schedules';
import { useUpdateRental } from '@/hooks/use-rentals';
import { useUpdateEvent } from '@/hooks/use-events';
import { useUpdateReservation } from '@/hooks/use-reservations';
import { useCalendarEvents } from '@/hooks/use-calendar';
import { ScheduleCalendar } from './schedule-calendar';
import { CalendarEventDialog } from './calendar-event-dialog';
import { AttendanceSheet } from './attendance-sheet';
import { ScheduleFilters as FilterType } from '@/lib/api/schedules';
import type { Schedule } from '@/lib/api/schedules';
import type { Rental } from '@/lib/api/rentals';
import type { Event } from '@/lib/api/events';
import type { Reservation } from '@/lib/api/reservations';

type CalendarEventType = 'schedule' | 'rental' | 'event' | 'reservation';

export default function SchedulePage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterType>({});
  const [dateRangeFilters, setDateRangeFilters] = useState<{ startDate?: string; endDate?: string }>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<CalendarEventType>('schedule');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>();
  const [selectedRental, setSelectedRental] = useState<Rental | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | undefined>();
  const [selectedDateRange, setSelectedDateRange] = useState<{ date: string; startTime: string; endTime: string; roomId?: string } | null>(null);

  // Оптимизация: используем один запрос вместо 4 отдельных
  // Объединяем фильтры с диапазоном дат
  const mergedFilters = { ...filters, ...dateRangeFilters };
  const { data: calendarData, isLoading } = useCalendarEvents(mergedFilters);
  const schedules = calendarData?.schedules || [];
  const rentals = calendarData?.rentals || [];
  const events = calendarData?.events || [];
  const reservations = calendarData?.reservations || [];

  const updateScheduleMutation = useUpdateSchedule();
  const updateRentalMutation = useUpdateRental();
  const updateEventMutation = useUpdateEvent();
  const updateReservationMutation = useUpdateReservation();

  const handleEventClick = (eventId: string, eventType: CalendarEventType) => {
    switch (eventType) {
      case 'schedule':
        const schedule = schedules?.find((s) => s.id === eventId);
        if (schedule) {
          setSelectedSchedule(schedule);
          setSelectedRental(undefined);
          setSelectedEvent(undefined);
          setSelectedReservation(undefined);
          setSelectedEventType('schedule');
          setIsEditDialogOpen(true);
        }
        break;
      case 'rental':
        const rental = rentals?.find((r) => r.id === eventId);
        if (rental) {
          setSelectedRental(rental);
          setSelectedSchedule(undefined);
          setSelectedEvent(undefined);
          setSelectedReservation(undefined);
          setSelectedEventType('rental');
          setIsEditDialogOpen(true);
        }
        break;
      case 'event':
        const event = events?.find((e) => e.id === eventId);
        if (event) {
          setSelectedEvent(event);
          setSelectedSchedule(undefined);
          setSelectedRental(undefined);
          setSelectedReservation(undefined);
          setSelectedEventType('event');
          setIsEditDialogOpen(true);
        }
        break;
      case 'reservation':
        const reservation = reservations?.find((r) => r.id === eventId);
        if (reservation) {
          setSelectedReservation(reservation);
          setSelectedSchedule(undefined);
          setSelectedRental(undefined);
          setSelectedEvent(undefined);
          setSelectedEventType('reservation');
          setIsEditDialogOpen(true);
        }
        break;
    }
  };

  const handleDateSelect = (dateRange: { date: string; startTime: string; endTime: string; roomId?: string }) => {
    setSelectedDateRange(dateRange);
    setSelectedSchedule(undefined);
    setSelectedRental(undefined);
    setSelectedEvent(undefined);
    setSelectedReservation(undefined);
    setIsCreateDialogOpen(true);
  };

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setSelectedSchedule(undefined);
      setSelectedRental(undefined);
      setSelectedEvent(undefined);
      setSelectedReservation(undefined);
    }
  };

  const handleCreateDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setSelectedDateRange(null);
    }
  };

  const handleEventDrop = async (
    eventId: string,
    eventType: CalendarEventType,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    newRoomId?: string
  ) => {
    try {
      switch (eventType) {
        case 'schedule':
          const schedule = schedules?.find((s) => s.id === eventId);
          if (schedule) {
            await updateScheduleMutation.mutateAsync({
              id: eventId,
              data: {
                date: newDate,
                startTime: newStartTime,
                endTime: newEndTime,
                ...(newRoomId && { roomId: newRoomId }),
              },
            });
          }
          break;
        case 'rental':
          const rental = rentals?.find((r) => r.id === eventId);
          if (rental) {
            await updateRentalMutation.mutateAsync({
              id: eventId,
              data: {
                date: newDate,
                startTime: newStartTime,
                endTime: newEndTime,
                ...(newRoomId && { roomId: newRoomId }),
              },
            });
          }
          break;
        case 'event':
          const event = events?.find((e) => e.id === eventId);
          if (event) {
            await updateEventMutation.mutateAsync({
              id: eventId,
              data: {
                date: newDate,
                startTime: newStartTime,
                endTime: newEndTime,
                ...(newRoomId && { roomId: newRoomId }),
              },
            });
          }
          break;
        case 'reservation':
          const reservation = reservations?.find((r) => r.id === eventId);
          if (reservation) {
            await updateReservationMutation.mutateAsync({
              id: eventId,
              data: {
                date: newDate,
                startTime: newStartTime,
                endTime: newEndTime,
                ...(newRoomId && { roomId: newRoomId }),
              },
            });
          }
          break;
      }
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Failed to update event:', error);
    }
  };

  return (
    <div className="flex flex-col gap-0 h-screen overflow-hidden pt-0">
      <div className="flex-1 overflow-hidden -mt-2">
        <ScheduleCalendar
          schedules={schedules}
          rentals={rentals}
          events={events}
          reservations={reservations}
          isLoading={isLoading}
          onEventClick={handleEventClick}
          onDateSelect={handleDateSelect}
          onEventDrop={handleEventDrop}
          filters={filters}
          onFiltersChange={setFilters}
          onDateRangeChange={setDateRangeFilters}
          showPlanButton={user?.role === 'ADMIN'}
          onAddClick={() => setIsCreateDialogOpen(true)}
        />
      </div>

      <CalendarEventDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
        initialData={selectedDateRange || undefined}
      />

      <CalendarEventDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        eventType={selectedEventType}
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
