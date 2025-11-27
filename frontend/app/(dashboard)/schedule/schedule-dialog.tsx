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
import { DatePicker } from '@/components/ui/date-picker';
import { useCreateSchedule, useUpdateSchedule } from '@/hooks/use-schedules';
import { useRooms } from '@/hooks/use-rooms';
import { useTeachers } from '@/hooks/use-teachers';
import { useGroups } from '@/hooks/use-groups';
import { Schedule } from '@/lib/api/schedules';

const typeOptions = [
  { value: 'GROUP_CLASS', label: 'Групповое занятие' },
  { value: 'INDIVIDUAL_CLASS', label: 'Индивидуальное занятие' },
  { value: 'OPEN_CLASS', label: 'Открытый урок' },
  { value: 'EVENT', label: 'Мероприятие' },
] as const;

const statusOptions = [
  { value: 'PLANNED', label: 'Запланировано' },
  { value: 'ONGOING', label: 'В процессе' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Отменено' },
] as const;

const formSchema = z.object({
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

type FormValues = z.infer<typeof formSchema>;

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule;
  initialData?: {
    date: string;
    startTime: string;
    endTime: string;
    roomId?: string;
  } | null;
}

export function ScheduleDialog({ open, onOpenChange, schedule, initialData }: ScheduleDialogProps) {
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const { data: rooms } = useRooms();
  const { data: teachers } = useTeachers();
  const { data: groups } = useGroups();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId: '',
      teacherId: '',
      roomId: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      type: 'GROUP_CLASS',
      status: 'PLANNED',
      notes: '',
    },
  });

  useEffect(() => {
    if (schedule) {
      // Extract time from datetime string (format: "1970-01-01T10:00:00.000Z" or "10:00:00")
      const startTime = schedule.startTime.includes('T')
        ? schedule.startTime.split('T')[1].slice(0, 5)
        : schedule.startTime.split(':').slice(0, 2).join(':');
      const endTime = schedule.endTime.includes('T')
        ? schedule.endTime.split('T')[1].slice(0, 5)
        : schedule.endTime.split(':').slice(0, 2).join(':');

      // Extract date (format: "2025-11-16T00:00:00.000Z" or "2025-11-16")
      const date = schedule.date.split('T')[0];

      form.reset({
        groupId: schedule.groupId || '',
        teacherId: schedule.teacherId,
        roomId: schedule.roomId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        type: schedule.type,
        status: schedule.status || 'PLANNED',
        notes: schedule.notes || '',
      });
    } else if (initialData) {
      form.reset({
        groupId: '',
        teacherId: '',
        roomId: initialData.roomId || '',
        date: initialData.date,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        type: 'GROUP_CLASS',
        status: 'PLANNED',
        notes: '',
      });
    } else {
      form.reset({
        groupId: '',
        teacherId: '',
        roomId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        type: 'GROUP_CLASS',
        status: 'PLANNED',
        notes: '',
      });
    }
  }, [schedule, initialData, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      const submitData = {
        ...values,
        groupId: values.groupId || undefined,
        notes: values.notes || undefined,
      };

      if (schedule) {
        await updateSchedule.mutateAsync({ id: schedule.id, data: submitData });
      } else {
        await createSchedule.mutateAsync(submitData);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Редактировать занятие' : 'Создать занятие'}
          </DialogTitle>
          <DialogDescription>
            {schedule
              ? 'Внесите изменения в данные занятия'
              : 'Заполните информацию о новом занятии'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип занятия *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                          <SelectValue placeholder="Не выбрано" />
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
                    <FormDescription>Для группового занятия</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Преподаватель *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
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

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Помещение *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация..."
                      rows={3}
                      {...field}
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
                disabled={createSchedule.isPending || updateSchedule.isPending}
              >
                {schedule ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
