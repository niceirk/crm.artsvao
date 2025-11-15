'use client';

import { useEffect } from 'react';
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
import { useCreateEvent, useUpdateEvent } from '@/hooks/use-events';
import { useEventTypes } from '@/hooks/use-event-types';
import { useRooms } from '@/hooks/use-rooms';
import { useTeachers } from '@/hooks/use-teachers';
import { Event } from '@/lib/api/events';
import { Checkbox } from '@/components/ui/checkbox';

const statusOptions = [
  { value: 'PLANNED', label: 'Запланировано' },
  { value: 'ONGOING', label: 'В процессе' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Отменено' },
] as const;

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  eventTypeId: z.string().optional(),
  roomId: z.string().min(1, 'Выберите помещение'),
  date: z.string().min(1, 'Выберите дату'),
  startTime: z.string().min(1, 'Введите время начала'),
  endTime: z.string().min(1, 'Введите время окончания'),
  responsibleUserId: z.string().optional(),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  participants: z.coerce.number().min(0).optional(),
  budget: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
}

export function EventDialog({ open, onOpenChange, event }: EventDialogProps) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const { data: eventTypes } = useEventTypes();
  const { data: rooms } = useRooms();
  const { data: teachers } = useTeachers();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      eventTypeId: '',
      roomId: '',
      date: '',
      startTime: '',
      endTime: '',
      responsibleUserId: '',
      status: 'PLANNED',
      notes: '',
      participants: undefined,
      budget: undefined,
    },
  });

  useEffect(() => {
    if (event) {
      // Extract date and time in correct format
      const eventDate = event.date.split('T')[0];
      const startTime = event.startTime.includes('T')
        ? event.startTime.split('T')[1].slice(0, 5)
        : event.startTime.slice(0, 5);
      const endTime = event.endTime.includes('T')
        ? event.endTime.split('T')[1].slice(0, 5)
        : event.endTime.slice(0, 5);

      form.reset({
        name: event.name,
        eventTypeId: event.eventTypeId || '',
        roomId: event.roomId,
        date: eventDate,
        startTime: startTime,
        endTime: endTime,
        responsibleUserId: event.responsibleUserId || '',
        status: event.status,
        notes: event.notes || '',
        participants: event.participants || undefined,
        budget: event.budget || undefined,
      });
    } else {
      form.reset({
        name: '',
        eventTypeId: '',
        roomId: '',
        date: '',
        startTime: '',
        endTime: '',
        responsibleUserId: '',
        status: 'PLANNED',
        notes: '',
        participants: undefined,
        budget: undefined,
      });
    }
  }, [event, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      const submitData = {
        ...values,
        eventTypeId: values.eventTypeId || undefined,
        responsibleUserId: values.responsibleUserId || undefined,
      };

      if (event) {
        await updateEvent.mutateAsync({ id: event.id, data: submitData });
      } else {
        await createEvent.mutateAsync(submitData);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const getTeacherFullName = (teacher: any) => {
    return [teacher.lastName, teacher.firstName, teacher.middleName]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Редактировать мероприятие' : 'Создать мероприятие'}
          </DialogTitle>
          <DialogDescription>
            {event
              ? 'Внесите изменения в данные мероприятия'
              : 'Заполните информацию о новом мероприятии'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название *</FormLabel>
                  <FormControl>
                    <Input placeholder="Концерт, Конференция, Выставка..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип мероприятия</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Не выбрано" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Не выбрано</SelectItem>
                        {eventTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
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
                name="responsibleUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ответственное лицо</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Не выбрано" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Не выбрано</SelectItem>
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Участников</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Бюджет</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Рублей</FormDescription>
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
                      placeholder="Дополнительная информация о мероприятии"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                {event ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
