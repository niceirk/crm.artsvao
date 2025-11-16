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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSchedules, useCopySchedules } from '@/hooks/use-schedules';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CopyScheduleFormData {
  sourceDate: string;
  targetDate: string;
  preserveTime: boolean;
  autoEnrollClients: boolean;
}

export function CopyScheduleForm() {
  const [sourceDate, setSourceDate] = useState<Date>();
  const [targetDate, setTargetDate] = useState<Date>();
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);

  const form = useForm<CopyScheduleFormData>({
    defaultValues: {
      preserveTime: true,
      autoEnrollClients: true,
    },
  });

  const { data: schedules, isLoading: schedulesLoading } = useSchedules(
    sourceDate ? { date: format(sourceDate, 'yyyy-MM-dd') } : undefined
  );
  const copySchedules = useCopySchedules();

  const onSubmit = (data: CopyScheduleFormData) => {
    if (selectedSchedules.length === 0 || !targetDate) {
      return;
    }

    copySchedules.mutate({
      scheduleIds: selectedSchedules,
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      preserveTime: data.preserveTime,
      autoEnrollClients: data.autoEnrollClients,
    }, {
      onSuccess: () => {
        setSelectedSchedules([]);
        form.reset({
          preserveTime: true,
          autoEnrollClients: true,
        });
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Исходная дата</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !sourceDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {sourceDate ? format(sourceDate, 'PPP', { locale: ru }) : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={sourceDate}
                onSelect={setSourceDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Целевая дата</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !targetDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {targetDate ? format(targetDate, 'PPP', { locale: ru }) : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={targetDate}
                onSelect={setTargetDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {sourceDate && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              Занятия для копирования ({selectedSchedules.length} выбрано)
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

      {selectedSchedules.length > 0 && targetDate && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="preserveTime"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Сохранить время занятий
                    </FormLabel>
                    <FormDescription>
                      Занятия будут скопированы с тем же временем начала и окончания
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoEnrollClients"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Автоматически записывать учеников
                    </FormLabel>
                    <FormDescription>
                      Ученики с активными абонементами будут автоматически записаны на скопированные занятия
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm">
                <strong>Копирование:</strong> {selectedSchedules.length} занятий
              </p>
              <p className="text-sm text-muted-foreground">
                {sourceDate && format(sourceDate, 'PPP', { locale: ru })} → {targetDate && format(targetDate, 'PPP', { locale: ru })}
              </p>
            </div>

            <Button
              type="submit"
              disabled={copySchedules.isPending}
              className="w-full"
            >
              {copySchedules.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Скопировать занятия
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
