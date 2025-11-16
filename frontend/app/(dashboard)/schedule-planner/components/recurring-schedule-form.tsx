'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useGroups } from '@/hooks/use-groups';
import { useTeachers } from '@/hooks/use-teachers';
import { useRooms } from '@/hooks/use-rooms';
import { useCreateRecurringSchedule } from '@/hooks/use-schedules';
import { Loader2 } from 'lucide-react';

interface RecurringScheduleFormData {
  groupId: string;
  teacherId: string;
  roomId: string;
  type: 'GROUP_CLASS' | 'INDIVIDUAL_CLASS' | 'OPEN_CLASS' | 'EVENT';
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  autoEnrollClients: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' },
];

export function RecurringScheduleForm() {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const form = useForm<RecurringScheduleFormData>({
    defaultValues: {
      type: 'GROUP_CLASS',
      autoEnrollClients: true,
      daysOfWeek: [],
    },
  });

  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const createRecurring = useCreateRecurringSchedule();

  const onSubmit = (data: RecurringScheduleFormData) => {
    createRecurring.mutate({
      groupId: data.groupId,
      teacherId: data.teacherId,
      roomId: data.roomId,
      type: data.type,
      recurrenceRule: {
        daysOfWeek: selectedDays,
        startDate: data.startDate,
        endDate: data.endDate,
        time: {
          start: data.startTime,
          end: data.endTime,
        },
      },
      autoEnrollClients: data.autoEnrollClients,
    }, {
      onSuccess: () => {
        form.reset();
        setSelectedDays([]);
      },
    });
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="groupId"
            rules={{ required: 'Выберите группу' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Группа</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите группу" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {groupsLoading ? (
                      <SelectItem value="loading" disabled>Загрузка...</SelectItem>
                    ) : (
                      groups?.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="teacherId"
            rules={{ required: 'Выберите преподавателя' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Преподаватель</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите преподавателя" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teachersLoading ? (
                      <SelectItem value="loading" disabled>Загрузка...</SelectItem>
                    ) : (
                      teachers?.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.lastName} {teacher.firstName} {teacher.middleName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Тип занятия</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="GROUP_CLASS">Групповое занятие</SelectItem>
                    <SelectItem value="INDIVIDUAL_CLASS">Индивидуальное занятие</SelectItem>
                    <SelectItem value="OPEN_CLASS">Открытое занятие</SelectItem>
                    <SelectItem value="EVENT">Мероприятие</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roomId"
            rules={{ required: 'Выберите помещение' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Помещение</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите помещение" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roomsLoading ? (
                      <SelectItem value="loading" disabled>Загрузка...</SelectItem>
                    ) : (
                      rooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.number ? `(${room.number})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium leading-none">
            Дни недели
          </label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={selectedDays.includes(day.value)}
                  onCheckedChange={() => handleDayToggle(day.value)}
                />
                <label
                  htmlFor={`day-${day.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {day.label}
                </label>
              </div>
            ))}
          </div>
          {selectedDays.length === 0 && (
            <p className="text-sm text-destructive mt-1">Выберите хотя бы один день недели</p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            rules={{ required: 'Укажите дату начала' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата начала</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            rules={{ required: 'Укажите дату окончания' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата окончания</FormLabel>
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
            rules={{ required: 'Укажите время начала' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Время начала</FormLabel>
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
            rules={{ required: 'Укажите время окончания' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Время окончания</FormLabel>
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
          name="autoEnrollClients"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="leading-none">
                <FormLabel>
                  Автоматически записывать учеников
                </FormLabel>
                <FormDescription className="mt-1">
                  Ученики с активными абонементами будут автоматически записаны на созданные занятия
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={createRecurring.isPending || selectedDays.length === 0}
          className="w-full"
        >
          {createRecurring.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Создать повторяющиеся занятия
        </Button>
      </form>
    </Form>
  );
}
