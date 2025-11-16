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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSchedules, useBulkCancelSchedules } from '@/hooks/use-schedules';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BulkCancelFormData {
  action: 'CANCEL' | 'TRANSFER';
  reason: string;
  transferDate?: string;
  transferStartTime?: string;
  transferEndTime?: string;
  notifyClients: boolean;
}

export function BulkCancelForm() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [transferDate, setTransferDate] = useState<Date>();
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);

  const form = useForm<BulkCancelFormData>({
    defaultValues: {
      action: 'CANCEL',
      notifyClients: true,
    },
  });

  const action = form.watch('action');

  const { data: schedules, isLoading: schedulesLoading } = useSchedules(
    selectedDate ? { date: format(selectedDate, 'yyyy-MM-dd') } : undefined
  );
  const bulkCancel = useBulkCancelSchedules();

  const onSubmit = (data: BulkCancelFormData) => {
    if (selectedSchedules.length === 0) {
      return;
    }

    const requestData: any = {
      scheduleIds: selectedSchedules,
      reason: data.reason,
      action: data.action,
      notifyClients: data.notifyClients,
    };

    if (data.action === 'TRANSFER' && transferDate) {
      requestData.transferDate = format(transferDate, 'yyyy-MM-dd');
      if (data.transferStartTime) requestData.transferStartTime = data.transferStartTime;
      if (data.transferEndTime) requestData.transferEndTime = data.transferEndTime;
    }

    bulkCancel.mutate(requestData, {
      onSuccess: () => {
        setSelectedSchedules([]);
        setTransferDate(undefined);
        form.reset({
          action: 'CANCEL',
          notifyClients: true,
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
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Действие</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CANCEL">Отменить занятия</SelectItem>
                      <SelectItem value="TRANSFER">Перенести занятия</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {action === 'CANCEL'
                      ? 'Занятия будут отменены без переноса'
                      : 'Занятия будут перенесены на другую дату'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              rules={{ required: 'Укажите причину' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Причина {action === 'CANCEL' ? 'отмены' : 'переноса'}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Например: болезнь преподавателя, праздничный день и т.д."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {action === 'TRANSFER' && (
              <>
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Дата переноса
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal mt-2',
                          !transferDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {transferDate ? format(transferDate, 'PPP', { locale: ru }) : 'Выберите дату переноса'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={transferDate}
                        onSelect={setTransferDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {!transferDate && (
                    <p className="text-sm text-destructive mt-2">Выберите дату переноса</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="transferStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Новое время начала (опционально)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Оставьте пустым, чтобы сохранить текущее время
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transferEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Новое время окончания (опционально)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Оставьте пустым, чтобы сохранить текущее время
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="notifyClients"
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
                      Уведомить учеников
                    </FormLabel>
                    <FormDescription>
                      Ученики получат уведомление об {action === 'CANCEL' ? 'отмене' : 'переносе'} занятий
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={bulkCancel.isPending || (action === 'TRANSFER' && !transferDate)}
              className="w-full"
              variant={action === 'CANCEL' ? 'destructive' : 'default'}
            >
              {bulkCancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === 'CANCEL' ? 'Отменить' : 'Перенести'} занятия ({selectedSchedules.length})
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
