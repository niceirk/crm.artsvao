'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { useSchedules, useBulkDeleteSchedules } from '@/hooks/use-schedules';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function BulkDeleteForm() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: schedules, isLoading: schedulesLoading } = useSchedules(
    selectedDate ? { date: format(selectedDate, 'yyyy-MM-dd') } : undefined
  );
  const bulkDelete = useBulkDeleteSchedules();

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

  const handleDelete = () => {
    if (selectedSchedules.length === 0) return;

    bulkDelete.mutate(
      { scheduleIds: selectedSchedules },
      {
        onSuccess: () => {
          setSelectedSchedules([]);
          setShowDeleteConfirm(false);
        },
      }
    );
  };

  const totalAttendances = schedules
    ?.filter(s => selectedSchedules.includes(s.id))
    .reduce((sum, s) => sum + (s._count?.attendances || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Выберите дату и занятия для удаления</h3>
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
              Занятия для удаления ({selectedSchedules.length} выбрано)
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
                        {schedule._count?.attendances && schedule._count.attendances > 0 && (
                          <span className="ml-2 text-amber-600">
                            • Записей: {schedule._count.attendances}
                          </span>
                        )}
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
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
              ⚠️ Внимание
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>• Будет удалено занятий: <strong>{selectedSchedules.length}</strong></li>
              {totalAttendances > 0 && (
                <li>• Будет отменено записей клиентов: <strong>{totalAttendances}</strong></li>
              )}
              <li>• Все занятия будут автоматически возвращены в абонементы клиентов</li>
              <li>• Это действие нельзя отменить</li>
            </ul>
          </div>

          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={bulkDelete.isPending}
            className="w-full"
          >
            {bulkDelete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Удалить занятия ({selectedSchedules.length})
          </Button>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {selectedSchedules.length} занятий?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Будет удалено {selectedSchedules.length} занятий
              {totalAttendances > 0 && ` и отменено ${totalAttendances} записей клиентов`}.
              Все занятия будут автоматически возвращены в абонементы клиентов.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
