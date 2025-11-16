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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGroups } from '@/hooks/use-groups';
import { useTeachers } from '@/hooks/use-teachers';
import { useRooms } from '@/hooks/use-rooms';
import { useSchedules, useBulkUpdateSchedules } from '@/hooks/use-schedules';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BulkUpdateFormData {
  date?: string;
  groupId?: string;
  teacherId?: string;
  roomId?: string;
  startTime?: string;
  endTime?: string;
  type?: 'GROUP_CLASS' | 'INDIVIDUAL_CLASS' | 'OPEN_CLASS' | 'EVENT';
  status?: string;
}

export function BulkUpdateForm() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);

  const form = useForm<BulkUpdateFormData>({
    defaultValues: {},
  });

  const { data: groups } = useGroups();
  const { data: teachers } = useTeachers();
  const { data: rooms } = useRooms();
  const { data: schedules, isLoading: schedulesLoading } = useSchedules(
    selectedDate ? { date: format(selectedDate, 'yyyy-MM-dd') } : undefined
  );
  const bulkUpdate = useBulkUpdateSchedules();

  const onSubmit = (data: BulkUpdateFormData) => {
    if (selectedSchedules.length === 0) {
      return;
    }

    const updateData: any = {
      scheduleIds: selectedSchedules,
    };

    if (data.groupId) updateData.groupId = data.groupId;
    if (data.teacherId) updateData.teacherId = data.teacherId;
    if (data.roomId) updateData.roomId = data.roomId;
    if (data.startTime) updateData.startTime = data.startTime;
    if (data.endTime) updateData.endTime = data.endTime;
    if (data.type) updateData.type = data.type;
    if (data.status) updateData.status = data.status;

    bulkUpdate.mutate(updateData, {
      onSuccess: () => {
        form.reset();
        setSelectedSchedules([]);
      },
    });
  };

  const handleScheduleToggle = (scheduleId: string) => {
    setSelectedSchedules(prev =>
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSelectAll = () => {
    if (schedules) {
      setSelectedSchedules(schedules.map(s => s.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedSchedules([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Выберите дату и занятия</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP', { locale: ru }) : 'Выберите дату'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {selectedDate && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              Занятия ({selectedSchedules.length} выбрано)
            </h4>
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={!schedules || schedules.length === 0}
              >
                Выбрать все
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedSchedules.length === 0}
              >
                Снять выбор
              </Button>
            </div>
          </div>

          <div className="border rounded-md max-h-64 overflow-y-auto">
            {schedulesLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : schedules && schedules.length > 0 ? (
              <div className="divide-y">
                {schedules.map((schedule) => (
                  <label
                    key={schedule.id}
                    className="flex items-center p-3 hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSchedules.includes(schedule.id)}
                      onChange={() => handleScheduleToggle(schedule.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {schedule.group?.name || 'Без группы'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime} | {schedule.teacher.lastName} {schedule.teacher.firstName} | {schedule.room.name}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Занятия не найдены
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSchedules.length > 0 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Заполните только те поля, которые хотите изменить
            </p>

            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Группа</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Без изменений" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                  <FormLabel>Преподаватель</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Без изменений" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers?.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.lastName} {teacher.firstName}
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
                  <FormLabel>Помещение</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Без изменений" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время начала</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="Без изменений" {...field} />
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
                    <FormLabel>Время окончания</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="Без изменений" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип занятия</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Без изменений" />
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Статус</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Без изменений" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">Запланировано</SelectItem>
                      <SelectItem value="COMPLETED">Завершено</SelectItem>
                      <SelectItem value="CANCELLED">Отменено</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={bulkUpdate.isPending}
              className="w-full"
            >
              {bulkUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Обновить выбранные занятия ({selectedSchedules.length})
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
