'use client';

import { useEffect, useState } from 'react';
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
import { useCreateSchedule, useUpdateSchedule } from '@/hooks/use-schedules';
import { useCreateRental, useUpdateRental } from '@/hooks/use-rentals';
import { useCreateEvent, useUpdateEvent, useEvents } from '@/hooks/use-events';
import { useCreateReservation, useUpdateReservation } from '@/hooks/use-reservations';
import { useGroups } from '@/hooks/use-groups';
import { useTeachers } from '@/hooks/use-teachers';
import { useRooms } from '@/hooks/use-rooms';
import { useEventTypes } from '@/hooks/use-event-types';
import type { Schedule } from '@/lib/api/schedules';
import type { Rental } from '@/lib/api/rentals';
import type { Event } from '@/lib/api/events';
import type { Reservation } from '@/lib/api/reservations';

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
}

const scheduleFormSchema = z.object({
  groupId: z.string().optional(),
  teacherId: z.string().min(1, 'Выберите преподавателя'),
  roomId: z.string().min(1, 'Выберите помещение'),
  date: z.string().min(1, 'Выберите дату'),
  startTime: z.string().min(1, 'Введите время начала'),
  endTime: z.string().min(1, 'Введите время окончания'),
  type: z.enum(['GROUP_CLASS', 'INDIVIDUAL_CLASS']),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

const rentalFormSchema = z.object({
  roomId: z.string().min(1, 'Выберите помещение'),
  clientName: z.string().min(1, 'Введите имя арендатора'),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email('Неверный формат email').optional().or(z.literal('')),
  eventType: z.string().optional(),
  totalPrice: z.number().optional(),
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

export function CalendarEventDialog({
  open,
  onOpenChange,
  eventType: initialEventType,
  schedule,
  rental,
  event,
  reservation,
  initialData,
}: CalendarEventDialogProps) {
  const [selectedEventType, setSelectedEventType] = useState<EventType>(
    initialEventType || 'schedule'
  );

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const createRental = useCreateRental();
  const updateRental = useUpdateRental();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation();

  const { data: groups } = useGroups();
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
              clientName: '',
            });
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

  const onSubmit = async (values: any) => {
    try {
      switch (selectedEventType) {
        case 'schedule':
          if (schedule) {
            await updateSchedule.mutateAsync({ id: schedule.id, data: values });
          } else {
            await createSchedule.mutateAsync(values);
          }
          break;
        case 'rental':
          if (rental) {
            await updateRental.mutateAsync({ id: rental.id, data: values });
          } else {
            await createRental.mutateAsync(values);
          }
          break;
        case 'event':
          if (event) {
            // Обновление существующего мероприятия
            await updateEvent.mutateAsync({
              id: event.id,
              data: {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                            {groups?.map((group) => (
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
              </>
            )}

            {/* Поля для Аренды */}
            {selectedEventType === 'rental' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя арендатора *</FormLabel>
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
                      <Input type="date" {...field} />
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
                      <Input type="time" {...field} />
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
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="flex justify-end gap-2 pt-4">
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
