'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from '@/hooks/use-schedules';
import { useCreateRental, useUpdateRental, useDeleteRental } from '@/hooks/use-rentals';
import { useCreateEvent, useUpdateEvent, useDeleteEvent, useEvents } from '@/hooks/use-events';
import { useCreateReservation, useUpdateReservation, useDeleteReservation } from '@/hooks/use-reservations';
import { useCreateRentalApplication } from '@/hooks/use-rental-applications';
import { useGroups } from '@/hooks/use-groups';
import { useTeachers } from '@/hooks/use-teachers';
import { useRooms } from '@/hooks/use-rooms';
import { useEventTypes } from '@/hooks/use-event-types';
import { RoomDialog } from '@/app/(dashboard)/admin/rooms/room-dialog';
import { ClientSearch } from '@/components/clients/client-search';
import type { Schedule } from '@/lib/api/schedules';
import type { Rental } from '@/lib/api/rentals';
import type { Event } from '@/lib/api/events';
import type { Reservation } from '@/lib/api/reservations';
import type { Client } from '@/lib/types/clients';

type EventType = 'schedule' | 'rental' | 'event' | 'reservation';

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType?: EventType;
  schedule?: Schedule;
  rental?: Rental;
  event?: Event;
  reservation?: Reservation;
  initialData?: { date: string; startTime: string; endTime: string; roomId?: string };
  onOpenAttendance?: () => void;
  onOpenEventAttendance?: () => void;
}

const scheduleFormSchema = z.object({
  groupId: z.string().optional(),
  teacherId: z.string().min(1, 'Выберите преподавателя'),
  roomId: z.string().min(1, 'Выберите помещение'),
  date: z.string().min(1, 'Выберите дату'),
  startTime: z.string().min(1, 'Введите время начала'),
  endTime: z.string().min(1, 'Введите время окончания'),
  type: z.enum(['GROUP_CLASS', 'INDIVIDUAL_CLASS', 'OPEN_CLASS', 'EVENT']),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

const rentalFormSchema = z.object({
  roomId: z.string().min(1, 'Выберите помещение'),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email('Неверный формат email').optional().or(z.literal('')),
  eventType: z.string().optional(),
  totalPrice: z.number().min(0).optional(),
  date: z.string().min(1, 'Выберите дату'),
  startTime: z.string().min(1, 'Введите время начала'),
  endTime: z.string().min(1, 'Введите время окончания'),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

const eventFormSchema = z.object({
  eventId: z.string().min(1, 'Выберите мероприятие'),
  roomId: z.string().min(1, 'Выберите помещение'),
  date: z.string().min(1, 'Выберите дату'),
  startTime: z.string().min(1, 'Введите время начала'),
  endTime: z.string().min(1, 'Введите время окончания'),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

const reservationFormSchema = z.object({
  roomId: z.string().min(1, 'Выберите помещение'),
  date: z.string().min(1, 'Выберите дату'),
  startTime: z.string().min(1, 'Введите время начала'),
  endTime: z.string().min(1, 'Введите время окончания'),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  reservedBy: z.string().min(1, 'Введите имя'),
});

// Статусы заявки на аренду
const RENTAL_APPLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждена',
  ACTIVE: 'Активна',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

const RENTAL_APPLICATION_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// Статусы оплаты счёта
const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачено',
  PARTIALLY_PAID: 'Частично оплачено',
  OVERDUE: 'Просрочен',
  CANCELLED: 'Отменён',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

// Функция расчёта стоимости аренды
function calculateRentalPrice(
  rooms: { id: string; hourlyRate: number; dailyRateCoworking?: number; isCoworking?: boolean }[] | undefined,
  roomId: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  isCoworkingWithoutWorkspaces: boolean = false
): { hours: number; hourlyRate: number; total: number; isDaily: boolean; dailyRate?: number } | null {
  if (!rooms || !roomId || !startTime || !endTime) return null;

  const room = rooms.find(r => r.id === roomId);
  if (!room) return null;

  // Для коворкинга без рабочих мест - дневной тариф
  if (isCoworkingWithoutWorkspaces && room.dailyRateCoworking) {
    const dailyRate = Number(room.dailyRateCoworking) || 0;
    return {
      hours: 0,
      hourlyRate: 0,
      total: dailyRate,
      isDaily: true,
      dailyRate,
    };
  }

  const startParts = startTime.split(':');
  const endParts = endTime.split(':');
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || '0');
  const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1] || '0');
  const hours = (endMinutes - startMinutes) / 60;

  if (hours <= 0) return null;

  const hourlyRate = Number(room.hourlyRate) || 0;
  return {
    hours,
    hourlyRate,
    total: Math.round(hours * hourlyRate),
    isDaily: false,
  };
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  eventType: initialEventType,
  schedule,
  rental,
  event,
  reservation,
  initialData,
  onOpenAttendance,
  onOpenEventAttendance,
}: CalendarEventDialogProps) {
  const [selectedEventType, setSelectedEventType] = useState<EventType>(
    initialEventType || 'schedule'
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isFullDayMode, setIsFullDayMode] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [isCompensated, setIsCompensated] = useState(false);
  const [compensationNote, setCompensationNote] = useState('');

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const createRental = useCreateRental();
  const updateRental = useUpdateRental();
  const deleteRental = useDeleteRental();
  const createRentalApplication = useCreateRentalApplication();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation();
  const deleteReservation = useDeleteReservation();

  const { data: groups } = useGroups({ limit: 1000 });
  const { data: teachers } = useTeachers();
  const { data: rooms } = useRooms();
  const { data: eventTypes } = useEventTypes();
  const { data: eventsList } = useEvents();

  // Определяем схему валидации в зависимости от типа события
  const getFormSchema = () => {
    switch (selectedEventType) {
      case 'schedule':
        return scheduleFormSchema;
      case 'rental':
        return rentalFormSchema;
      case 'event':
        return eventFormSchema;
      case 'reservation':
        return reservationFormSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getFormSchema()),
    defaultValues: {},
  });

  // Следим за значениями полей для расчёта стоимости аренды
  const watchedRoomId = form.watch('roomId');
  const watchedStartTime = form.watch('startTime');
  const watchedEndTime = form.watch('endTime');
  const watchedStatus = form.watch('status');

  // Определяем выбранную комнату
  const selectedRoom = useMemo(() => {
    if (!watchedRoomId || !rooms) return null;
    return rooms.find(r => r.id === watchedRoomId) || null;
  }, [watchedRoomId, rooms]);

  // Проверяем, является ли помещение коворкингом без рабочих мест
  const isCoworkingWithoutWorkspaces = useMemo(() => {
    if (!selectedRoom) return false;
    return selectedRoom.isCoworking === true && (selectedRoom._count?.workspaces ?? 0) === 0;
  }, [selectedRoom]);

  // Автоматический расчёт стоимости аренды
  const calculatedRentalPrice = useMemo(() => {
    if (selectedEventType !== 'rental') return null;
    return calculateRentalPrice(rooms, watchedRoomId, watchedStartTime, watchedEndTime, isCoworkingWithoutWorkspaces);
  }, [selectedEventType, rooms, watchedRoomId, watchedStartTime, watchedEndTime, isCoworkingWithoutWorkspaces]);

  // Сбрасываем форму при смене типа события или открытии диалога
  useEffect(() => {
    if (open) {
      if (schedule) {
        setSelectedEventType('schedule');
        // Extract date and time in correct format
        const scheduleDate = schedule.date.split('T')[0];
        const startTime = schedule.startTime.includes('T')
          ? schedule.startTime.split('T')[1].slice(0, 5)
          : schedule.startTime.slice(0, 5);
        const endTime = schedule.endTime.includes('T')
          ? schedule.endTime.split('T')[1].slice(0, 5)
          : schedule.endTime.slice(0, 5);

        form.reset({
          groupId: schedule.groupId || '',
          teacherId: schedule.teacherId,
          roomId: schedule.roomId,
          date: scheduleDate,
          startTime: startTime,
          endTime: endTime,
          type: schedule.type,
          status: schedule.status || 'PLANNED',
          notes: schedule.notes || '',
        });
      } else if (rental) {
        setSelectedEventType('rental');
        // Extract date and time in correct format
        const rentalDate = rental.date.split('T')[0];
        const startTime = rental.startTime.includes('T')
          ? rental.startTime.split('T')[1].slice(0, 5)
          : rental.startTime.slice(0, 5);
        const endTime = rental.endTime.includes('T')
          ? rental.endTime.split('T')[1].slice(0, 5)
          : rental.endTime.slice(0, 5);

        form.reset({
          roomId: rental.roomId,
          clientName: rental.clientName,
          eventType: rental.eventType === 'Не указано' ? '' : (rental.eventType || ''),
          date: rentalDate,
          startTime: startTime,
          endTime: endTime,
          status: rental.status,
          notes: rental.notes || '',
        });
      } else if (event) {
        setSelectedEventType('event');
        // Extract date and time in correct format
        const eventDate = event.date.split('T')[0];
        const startTime = event.startTime.includes('T')
          ? event.startTime.split('T')[1].slice(0, 5)
          : event.startTime.slice(0, 5);
        const endTime = event.endTime.includes('T')
          ? event.endTime.split('T')[1].slice(0, 5)
          : event.endTime.slice(0, 5);

        form.reset({
          eventId: event.id,
          roomId: event.roomId,
          date: eventDate,
          startTime: startTime,
          endTime: endTime,
          status: event.status,
          notes: event.notes || '',
        });
      } else if (reservation) {
        setSelectedEventType('reservation');
        // Extract date and time in correct format
        const reservationDate = reservation.date.split('T')[0];
        const startTime = reservation.startTime.includes('T')
          ? reservation.startTime.split('T')[1].slice(0, 5)
          : reservation.startTime.slice(0, 5);
        const endTime = reservation.endTime.includes('T')
          ? reservation.endTime.split('T')[1].slice(0, 5)
          : reservation.endTime.slice(0, 5);

        form.reset({
          roomId: reservation.roomId,
          date: reservationDate,
          startTime: startTime,
          endTime: endTime,
          status: reservation.status,
          notes: reservation.notes || '',
          reservedBy: reservation.reservedBy,
        });
      } else {
        // Новое событие - устанавливаем значения по умолчанию в зависимости от типа
        const baseData = {
          date: initialData?.date || new Date().toISOString().split('T')[0],
          startTime: initialData?.startTime || '10:00',
          endTime: initialData?.endTime || '11:00',
          roomId: initialData?.roomId || '',
          status: 'PLANNED' as const,
          notes: '',
        };

        switch (selectedEventType) {
          case 'schedule':
            form.reset({
              ...baseData,
              groupId: '',
              teacherId: '',
              type: 'GROUP_CLASS' as const,
            });
            break;
          case 'rental':
            form.reset({
              ...baseData,
              clientId: '',
              clientName: '',
              eventType: '',
              totalPrice: 0,
            });
            setSelectedClient(null);
            break;
          case 'event':
            form.reset({
              ...baseData,
              eventId: '',
            });
            break;
          case 'reservation':
            form.reset({
              ...baseData,
              reservedBy: '',
            });
            break;
        }
      }
    }
  }, [open, schedule, rental, event, reservation, initialData, form, selectedEventType]);

  // Автоустановка времени при режиме "Весь день"
  useEffect(() => {
    if (isFullDayMode && isCoworkingWithoutWorkspaces) {
      form.setValue('startTime', '08:00');
      form.setValue('endTime', '22:00');
    }
  }, [isFullDayMode, isCoworkingWithoutWorkspaces, form]);

  // Сброс режима "Весь день" при смене помещения
  useEffect(() => {
    setIsFullDayMode(false);
  }, [watchedRoomId]);

  // Сброс режима "Весь день" и инициализация компенсации при открытии диалога
  useEffect(() => {
    if (open) {
      setIsFullDayMode(false);
      // Если занятие уже отменено с компенсацией - показываем сохраненные значения
      if (schedule?.status === 'CANCELLED' && schedule?.isCompensated) {
        setIsCompensated(true);
        setCompensationNote(schedule.cancellationNote || '');
      } else {
        setIsCompensated(false);
        setCompensationNote('');
      }
    }
  }, [open, schedule]);

  const onSubmit = async (values: any) => {
    try {
      switch (selectedEventType) {
        case 'schedule':
          if (schedule) {
            const updateData: any = { ...values, version: schedule.version };
            // Добавить поля компенсации при отмене занятия
            if (values.status === 'CANCELLED' && schedule.status !== 'CANCELLED') {
              updateData.isCompensated = isCompensated;
              if (isCompensated && compensationNote) {
                updateData.compensationNote = compensationNote;
              }
            }
            await updateSchedule.mutateAsync({ id: schedule.id, data: updateData });
          } else {
            await createSchedule.mutateAsync(values);
          }
          break;
        case 'rental':
          // Используем рассчитанную стоимость
          const rentalPrice = calculatedRentalPrice?.total || 0;

          if (rental) {
            // Обновление существующей аренды
            await updateRental.mutateAsync({
              id: rental.id,
              data: { ...values, totalPrice: rentalPrice }
            });
          } else {
            // Создание новой аренды
            if (values.clientId) {
              // Если выбран клиент - создаем заявку на аренду (в статусе DRAFT)
              const room = rooms?.find(r => r.id === values.roomId);

              // Для коворкинга без рабочих мест - используем дневной тариф
              const isCoworkingRoom = room?.isCoworking === true && (room._count?.workspaces ?? 0) === 0;

              if (isCoworkingRoom && room.dailyRateCoworking) {
                await createRentalApplication.mutateAsync({
                  rentalType: 'ROOM_DAILY',
                  periodType: 'SPECIFIC_DAYS',
                  roomId: values.roomId,
                  clientId: values.clientId,
                  startDate: values.date,
                  startTime: values.startTime,
                  endTime: values.endTime,
                  basePrice: Number(room.dailyRateCoworking),
                  priceUnit: 'DAY',
                  eventType: values.eventType || 'Аренда коворкинга',
                  notes: values.notes,
                  ignoreConflicts: true,
                });
              } else {
                // Почасовая аренда
                const hourlyRate = Number(room?.hourlyRate) || calculatedRentalPrice?.hourlyRate || 0;
                await createRentalApplication.mutateAsync({
                  rentalType: 'HOURLY',
                  periodType: 'HOURLY',
                  roomId: values.roomId,
                  clientId: values.clientId,
                  startDate: values.date,
                  startTime: values.startTime,
                  endTime: values.endTime,
                  basePrice: hourlyRate,
                  priceUnit: 'HOUR',
                  eventType: values.eventType || 'Аренда',
                  notes: values.notes,
                  ignoreConflicts: true,
                });
              }
            } else {
              // Если клиент не выбран - создаем только Rental (как раньше)
              await createRental.mutateAsync({ ...values, totalPrice: rentalPrice });
            }
          }
          break;
        case 'event':
          if (event) {
            // Обновление существующего мероприятия
            await updateEvent.mutateAsync({
              id: event.id,
              data: {
                version: event.version,
                roomId: values.roomId,
                date: values.date,
                startTime: values.startTime,
                endTime: values.endTime,
                status: values.status,
                notes: values.notes,
              },
            });
          } else {
            // Создание нового - не поддерживается на странице расписания
            // Используйте страницу /admin/events для создания мероприятий
          }
          break;
        case 'reservation':
          if (reservation) {
            await updateReservation.mutateAsync({ id: reservation.id, data: values });
          } else {
            await createReservation.mutateAsync(values);
          }
          break;
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isEditing = !!(schedule || rental || event || reservation);

  const getTeacherFullName = (teacher: any) => {
    return [teacher.lastName, teacher.firstName, teacher.middleName]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать событие' : 'Создать событие'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Внесите изменения в данные события'
              : 'Выберите тип события и заполните информацию'}
          </DialogDescription>
        </DialogHeader>

        {!isEditing && (
          <Tabs value={selectedEventType} onValueChange={(v) => setSelectedEventType(v as EventType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="schedule">Занятие</TabsTrigger>
              <TabsTrigger value="rental">Аренда</TabsTrigger>
              <TabsTrigger value="event">Мероприятие</TabsTrigger>
              <TabsTrigger value="reservation">Резерв</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* Поля для Занятия */}
            {selectedEventType === 'schedule' && (
              <>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип занятия *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GROUP_CLASS">Групповое</SelectItem>
                          <SelectItem value="INDIVIDUAL_CLASS">Индивидуальное</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="groupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Группа</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                          value={field.value || '__none__'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Не выбрано (для индивидуальных)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Не выбрано</SelectItem>
                            {groups?.data?.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teacherId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Преподаватель *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите преподавателя" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teachers?.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {getTeacherFullName(teacher)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Помещение *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите помещение" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name} {room.number ? `(${room.number})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLANNED">Запланировано</SelectItem>
                          <SelectItem value="ONGOING">В процессе</SelectItem>
                          <SelectItem value="COMPLETED">Завершено</SelectItem>
                          <SelectItem value="CANCELLED">Отменено</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Блок компенсации при отмене занятия */}
                {schedule && watchedStatus === 'CANCELLED' && (schedule.status !== 'CANCELLED' || schedule.isCompensated) && (
                  <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-md">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="isCompensated"
                        checked={isCompensated}
                        onCheckedChange={(checked) => setIsCompensated(checked === true)}
                        disabled={schedule.status === 'CANCELLED'}
                      />
                      <label
                        htmlFor="isCompensated"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {schedule.status === 'CANCELLED' ? 'Компенсация согласована' : 'Считать отмену компенсацией'}
                      </label>
                    </div>

                    {isCompensated && (
                      <div className="pt-2">
                        <label className="text-sm font-medium mb-1.5 block">
                          {schedule.status === 'CANCELLED' ? 'Причина отмены' : 'Комментарий к компенсации'}
                        </label>
                        <Textarea
                          value={compensationNote}
                          onChange={(e) => setCompensationNote(e.target.value)}
                          placeholder="Например: Занятие отменено по техническим причинам"
                          rows={2}
                          disabled={schedule.status === 'CANCELLED'}
                        />
                        {schedule.status !== 'CANCELLED' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Этот комментарий будет добавлен к записям посещений
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Поля для Аренды */}
            {selectedEventType === 'rental' && (
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Клиент</FormLabel>
                      <FormControl>
                        <ClientSearch
                          value={field.value}
                          onValueChange={field.onChange}
                          onClientSelect={(client) => {
                            setSelectedClient(client);
                            if (client) {
                              form.setValue('clientName', `${client.lastName || ''} ${client.firstName || ''}`.trim());
                            }
                          }}
                          placeholder="Выберите клиента"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Помещение *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.map((room) => {
                            const isCoworkingNoWorkspaces = room.isCoworking && (room._count?.workspaces ?? 0) === 0;
                            return (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name} {room.number ? `(${room.number})` : ''} — {
                                  isCoworkingNoWorkspaces && room.dailyRateCoworking
                                    ? `${Number(room.dailyRateCoworking).toLocaleString('ru-RU')} ₽/день`
                                    : `${room.hourlyRate.toLocaleString('ru-RU')} ₽/ч`
                                }
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLANNED">Запланировано</SelectItem>
                          <SelectItem value="ONGOING">В процессе</SelectItem>
                          <SelectItem value="COMPLETED">Завершено</SelectItem>
                          <SelectItem value="CANCELLED">Отменено</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Блок для коворкинга без рабочих мест */}
            {selectedEventType === 'rental' && isCoworkingWithoutWorkspaces && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    Коворкинг (дневной тариф)
                  </span>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fullDayMode"
                      checked={isFullDayMode}
                      onCheckedChange={(checked) => setIsFullDayMode(checked === true)}
                    />
                    <label htmlFor="fullDayMode" className="text-sm text-blue-700 cursor-pointer">
                      Весь день (08:00 - 22:00)
                    </label>
                  </div>
                </div>
                {selectedRoom?.dailyRateCoworking && (
                  <div className="text-lg font-semibold text-blue-900">
                    {Number(selectedRoom.dailyRateCoworking).toLocaleString('ru-RU')} ₽ / день
                  </div>
                )}
                {!selectedRoom?.dailyRateCoworking && (
                  <div className="text-sm text-amber-700">
                    Дневной тариф не настроен для этого помещения.{' '}
                    <button
                      type="button"
                      onClick={() => setShowRoomDialog(true)}
                      className="text-gray-500 border-b border-dashed border-gray-400 hover:text-gray-700 hover:border-gray-600"
                    >
                      Установить тарифы
                    </button>
                  </div>
                )}
                {!isFullDayMode && selectedRoom?.dailyRateCoworking && (
                  <p className="text-xs text-blue-700 mt-1">
                    Выберите интервал времени ниже. Стоимость фиксирована - дневной тариф.
                  </p>
                )}
              </div>
            )}

            {/* Поля для Мероприятия */}
            {selectedEventType === 'event' && (
              <>
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Мероприятие *</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Выберите мероприятие" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {eventsList?.map((evt) => (
                              <SelectItem key={evt.id} value={evt.id}>
                                {evt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            window.open('/admin/events', '_blank');
                          }}
                        >
                          Создать
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Помещение *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите помещение" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rooms?.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name} {room.number ? `(${room.number})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Статус</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите статус" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLANNED">Запланировано</SelectItem>
                            <SelectItem value="ONGOING">В процессе</SelectItem>
                            <SelectItem value="COMPLETED">Завершено</SelectItem>
                            <SelectItem value="CANCELLED">Отменено</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Поля для Резерва */}
            {selectedEventType === 'reservation' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reservedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя резервирующего *</FormLabel>
                        <FormControl>
                          <Input placeholder="Иван Иванов" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Помещение *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите помещение" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rooms?.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name} {room.number ? `(${room.number})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLANNED">Запланировано</SelectItem>
                          <SelectItem value="ONGOING">В процессе</SelectItem>
                          <SelectItem value="COMPLETED">Завершено</SelectItem>
                          <SelectItem value="CANCELLED">Отменено</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Общие поля для всех типов */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(date) => field.onChange(date || '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время начала *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isFullDayMode && isCoworkingWithoutWorkspaces}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время окончания *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isFullDayMode && isCoworkingWithoutWorkspaces}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Блок стоимости и связи с заявкой (только для аренды) */}
            {selectedEventType === 'rental' && (
              <div className="p-3 bg-muted rounded-md space-y-2">
                {/* Стоимость - всегда видна */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Стоимость:</span>
                  {calculatedRentalPrice ? (
                    <div className="text-right">
                      <span className="text-lg font-semibold">
                        {calculatedRentalPrice.total.toLocaleString('ru-RU')} ₽
                      </span>
                      {calculatedRentalPrice.isDaily ? (
                        <span className="text-xs text-muted-foreground ml-2">
                          (дневной тариф коворкинга)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({calculatedRentalPrice.hours} ч × {calculatedRentalPrice.hourlyRate.toLocaleString('ru-RU')} ₽/ч)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Выберите помещение и время</span>
                  )}
                </div>

                {/* Заявка (если есть) */}
                {rental?.rentalApplication && (
                  <>
                    <div className="border-t pt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={RENTAL_APPLICATION_STATUS_COLORS[rental.rentalApplication.status]}>
                          {RENTAL_APPLICATION_STATUS_LABELS[rental.rentalApplication.status]}
                        </Badge>
                        <Link href={`/rentals/${rental.rentalApplication.id}`} className="text-sm text-primary hover:underline">
                          Заявка №{rental.rentalApplication.applicationNumber}
                        </Link>
                      </div>
                    </div>

                    {/* Счёт (если есть) */}
                    {rental.rentalApplication.invoices?.[0] && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={INVOICE_STATUS_COLORS[rental.rentalApplication.invoices[0].status]}>
                          {INVOICE_STATUS_LABELS[rental.rentalApplication.invoices[0].status]}
                        </Badge>
                        <Link href={`/invoices/${rental.rentalApplication.invoices[0].id}`} className="text-sm text-primary hover:underline">
                          Счёт №{rental.rentalApplication.invoices[0].invoiceNumber}
                        </Link>
                        <span className="text-sm font-medium ml-auto">
                          {rental.rentalApplication.invoices[0].totalAmount.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Примечания</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-2 pt-4">
              <div className="flex gap-2">
                {isEditing && selectedEventType === 'schedule' && schedule && schedule.group && onOpenAttendance && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenAttendance}
                  >
                    Журнал посещаемости
                  </Button>
                )}
                {isEditing && selectedEventType === 'schedule' && schedule && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteSchedule.isPending}
                  >
                    Удалить
                  </Button>
                )}
                {isEditing && selectedEventType === 'rental' && rental && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteRental.isPending}
                  >
                    Удалить
                  </Button>
                )}
                {isEditing && selectedEventType === 'event' && event && onOpenEventAttendance && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onOpenEventAttendance}
                    >
                      Журнал посещаемости
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleteEvent.isPending}
                    >
                      Удалить
                    </Button>
                  </>
                )}
                {isEditing && selectedEventType === 'reservation' && reservation && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteReservation.isPending}
                  >
                    Удалить
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createSchedule.isPending ||
                    updateSchedule.isPending ||
                    createRental.isPending ||
                    updateRental.isPending ||
                    createEvent.isPending ||
                    updateEvent.isPending ||
                    createReservation.isPending ||
                    updateReservation.isPending
                  }
                >
                  {isEditing ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Удалить {selectedEventType === 'schedule' ? 'занятие' : selectedEventType === 'rental' ? 'аренду' : selectedEventType === 'event' ? 'мероприятие' : 'резерв'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить.
            {selectedEventType === 'schedule' && schedule && (
              <>
                Занятие будет удалено, а записи клиентов отменены.
                Все занятия будут автоматически возвращены в абонементы клиентов.
                {schedule._count?.attendances && schedule._count.attendances > 0 && (
                  <span className="block mt-2 font-medium text-foreground">
                    Будет отменено записей: {schedule._count.attendances}
                  </span>
                )}
              </>
            )}
            {selectedEventType === 'rental' && rental && (
              rental.rentalApplication ? (
                <>
                  Эта аренда является частью заявки №{rental.rentalApplication.applicationNumber}.
                  {rental.rentalApplication._count?.rentals === 1 ? (
                    <span className="block mt-2 font-medium text-destructive">
                      Это единственный слот в заявке. Заявка будет полностью удалена.
                    </span>
                  ) : (
                    <span className="block mt-2">
                      Слот будет удален из заявки. Стоимость заявки будет пересчитана.
                    </span>
                  )}
                </>
              ) : (
                'Аренда будет удалена без возможности восстановления.'
              )
            )}
            {selectedEventType === 'event' && 'Мероприятие будет удалено без возможности восстановления.'}
            {selectedEventType === 'reservation' && 'Резерв будет удален без возможности восстановления.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (schedule && selectedEventType === 'schedule') {
                deleteSchedule.mutate(schedule.id, {
                  onSuccess: () => {
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  },
                });
              } else if (rental && selectedEventType === 'rental') {
                deleteRental.mutate(rental.id, {
                  onSuccess: () => {
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  },
                });
              } else if (event && selectedEventType === 'event') {
                deleteEvent.mutate(event.id, {
                  onSuccess: () => {
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  },
                });
              } else if (reservation && selectedEventType === 'reservation') {
                deleteReservation.mutate(reservation.id, {
                  onSuccess: () => {
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  },
                });
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Диалог редактирования помещения */}
    <RoomDialog
      open={showRoomDialog}
      onOpenChange={setShowRoomDialog}
      room={selectedRoom || undefined}
    />
    </>
  );
}
