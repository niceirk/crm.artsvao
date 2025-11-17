'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useSchedules, useUpdateSchedule } from '@/hooks/use-schedules';
import { useRentals, useUpdateRental } from '@/hooks/use-rentals';
import { useEvents, useUpdateEvent } from '@/hooks/use-events';
import { useReservations, useUpdateReservation } from '@/hooks/use-reservations';
import { ScheduleCalendar } from './schedule-calendar';
import { CalendarEventDialog } from './calendar-event-dialog';
import { ScheduleFilters } from './schedule-filters';
import { AttendanceSheet } from './attendance-sheet';
import { ScheduleFilters as FilterType } from '@/lib/api/schedules';
import type { Schedule } from '@/lib/api/schedules';
import type { Rental } from '@/lib/api/rentals';
import type { Event } from '@/lib/api/events';
import type { Reservation } from '@/lib/api/reservations';

type CalendarEventType = 'schedule' | 'rental' | 'event' | 'reservation';

export default function SchedulePage() {
  const [filters, setFilters] = useState<FilterType>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<CalendarEventType>('schedule');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>();
  const [selectedRental, setSelectedRental] = useState<Rental | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | undefined>();
  const [selectedDateRange, setSelectedDateRange] = useState<{ date: string; startTime: string; endTime: string; roomId?: string } | null>(null);

  // Separate eventTypeId from other filters for API calls
  const { eventTypeId, ...apiFilters } = filters;

  const { data: schedules, isLoading: isLoadingSchedules } = useSchedules(apiFilters);
  const { data: rentals, isLoading: isLoadingRentals } = useRentals(apiFilters);
  const { data: events, isLoading: isLoadingEvents } = useEvents(apiFilters);
  const { data: reservations, isLoading: isLoadingReservations } = useReservations(apiFilters);
  const updateScheduleMutation = useUpdateSchedule();
  const updateRentalMutation = useUpdateRental();
  const updateEventMutation = useUpdateEvent();
  const updateReservationMutation = useUpdateReservation();

  const isLoading = isLoadingSchedules || isLoadingRentals || isLoadingEvents || isLoadingReservations;

  // Client-side filtering by event type
  const selectedEventTypes = eventTypeId ? (Array.isArray(eventTypeId) ? eventTypeId : [eventTypeId]) : [];
  const shouldShowSchedules = selectedEventTypes.length === 0 || selectedEventTypes.includes('schedule');
  const shouldShowRentals = selectedEventTypes.length === 0 || selectedEventTypes.includes('rental');
  const shouldShowEvents = selectedEventTypes.length === 0 || selectedEventTypes.includes('event');
  const shouldShowReservations = selectedEventTypes.length === 0 || selectedEventTypes.includes('reservation');

  const filteredSchedules = shouldShowSchedules ? (schedules || []) : [];
  const filteredRentals = shouldShowRentals ? (rentals || []) : [];
  const filteredEvents = shouldShowEvents ? (events || []) : [];
  const filteredReservations = shouldShowReservations ? (reservations || []) : [];

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Расписание</h1>
          <p className="text-muted-foreground mt-1">
            Управление расписанием занятий и мероприятий
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить событие
        </Button>
      </div>

      <ScheduleFilters filters={filters} onFiltersChange={setFilters} />

      <Card>
        <CardContent className="pt-6">
          <ScheduleCalendar
            schedules={filteredSchedules}
            rentals={filteredRentals}
            events={filteredEvents}
            reservations={filteredReservations}
            isLoading={isLoading}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onEventDrop={handleEventDrop}
          />
        </CardContent>
      </Card>

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
        />
      )}
    </div>
  );
}
