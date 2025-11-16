'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Users, MapPin, Trash2 } from 'lucide-react';
import { groupsApi } from '@/lib/api/groups';
import { schedulesApi } from '@/lib/api/schedules';
import { toast } from '@/lib/utils/toast';

interface GroupMonthlyCalendarProps {
  groupId: string;
}

export function GroupMonthlyCalendar({ groupId }: GroupMonthlyCalendarProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  useEffect(() => {
    loadSchedules();
  }, [groupId, selectedMonth]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-').map(Number);
      const data = await groupsApi.getGroupMonthlySchedule(groupId, year, month);
      setSchedules(data);
      setSelectedSchedules(new Set()); // Сбрасываем выделение при загрузке новых данных
    } catch (error) {
      console.error('Failed to load schedules:', error);
      toast.error('Не удалось загрузить расписание');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSchedules(new Set(schedules.map(s => s.id)));
    } else {
      setSelectedSchedules(new Set());
    }
  };

  const handleSelectSchedule = (scheduleId: string, checked: boolean) => {
    const newSelected = new Set(selectedSchedules);
    if (checked) {
      newSelected.add(scheduleId);
    } else {
      newSelected.delete(scheduleId);
    }
    setSelectedSchedules(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedSchedules.size === 0) {
      toast.error('Выберите расписания для удаления');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить ${selectedSchedules.size} записей расписания?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await schedulesApi.bulkDelete({
        scheduleIds: Array.from(selectedSchedules),
        reason: 'Удалено через интерфейс группы',
      });
      toast.success(`Удалено записей: ${selectedSchedules.size}`);
      await loadSchedules(); // Перезагружаем данные
    } catch (error) {
      console.error('Failed to delete schedules:', error);
      toast.error('Не удалось удалить расписания');
    } finally {
      setIsDeleting(false);
    }
  };

  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1); // month-2 потому что месяцы с 0
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1); // month потому что месяцы с 0
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'short',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';

    // Если это уже строка в формате HH:mm:ss или HH:mm
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString.substring(0, 5);
    }

    // Если это Date объект или ISO строка
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      console.error('Failed to parse time:', timeString, e);
    }

    return timeString;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      'PLANNED': { variant: 'default', label: 'Запланировано' },
      'ONGOING': { variant: 'default', label: 'Идёт' },
      'COMPLETED': { variant: 'secondary', label: 'Завершено' },
      'CANCELLED': { variant: 'destructive', label: 'Отменено' },
    };

    const config = statusMap[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Расписание группы</CardTitle>
            <CardDescription>
              Занятия на месяц
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Кнопка удаления выбранных */}
            {selectedSchedules.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Удаление...' : `Удалить (${selectedSchedules.size})`}
              </Button>
            )}

            {/* Навигация по месяцам */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-[150px]">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-center"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              На выбранный месяц нет запланированных занятий
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Используйте планировщик выше для создания расписания
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSchedules.size === schedules.length && schedules.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead>Помещение</TableHead>
                  <TableHead>Участники</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow
                    key={schedule.id}
                    className={selectedSchedules.has(schedule.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedSchedules.has(schedule.id)}
                        onCheckedChange={(checked) =>
                          handleSelectSchedule(schedule.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatDate(schedule.date)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.teacher && (
                        <span className="text-sm">
                          {schedule.teacher.firstName} {schedule.teacher.lastName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {schedule.room && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span>{schedule.room.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {schedule._count && (
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          <span>{schedule._count.attendances}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(schedule.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
