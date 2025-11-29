'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Loader2, Check, ExternalLink, FileText } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { MedicalCertificate, UpdateMedicalCertificateDto } from '@/lib/types/medical-certificates';
import { useUpdateMedicalCertificate, usePreviewSchedules, useApplyToSchedules, useMedicalCertificate } from '@/hooks/use-medical-certificates';

interface EditCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: MedicalCertificate | null;
  // Можем передать только id если хотим загрузить полные данные
  certificateId?: string;
}

interface FormData {
  startDate: Date | undefined;
  endDate: Date | undefined;
  notes: string;
}

const attendanceStatusLabels: Record<string, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Отсутствовал',
  EXCUSED: 'Уваж. причина',
};

const attendanceStatusColors: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  EXCUSED: 'bg-yellow-100 text-yellow-800',
};

export function EditCertificateDialog({
  open,
  onOpenChange,
  certificate: certificateProp,
}: EditCertificateDialogProps) {
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      startDate: undefined,
      endDate: undefined,
      notes: '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const updateMutation = useUpdateMedicalCertificate();
  const applyMutation = useApplyToSchedules();

  // Загружаем полные данные справки с appliedSchedules
  const { data: fullCertificate, isLoading: certificateLoading } = useMedicalCertificate(
    open ? certificateProp?.id : undefined
  );

  // Используем полные данные если загружены, иначе переданные props
  const certificate = fullCertificate || certificateProp;

  // Получаем занятия за период
  const { data: schedules, isLoading: schedulesLoading } = usePreviewSchedules(
    certificate?.clientId,
    startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
  );

  // ID занятий, к которым уже применена справка
  const appliedScheduleIds = fullCertificate?.appliedSchedules?.map((s) => s.scheduleId) || [];

  // Заполнение формы данными справки при открытии
  useEffect(() => {
    if (open && certificate) {
      setValue('startDate', new Date(certificate.startDate));
      setValue('endDate', new Date(certificate.endDate));
      setValue('notes', certificate.notes || '');
    }
  }, [open, certificate, setValue]);

  // Предвыбираем уже примененные занятия когда они загрузятся
  useEffect(() => {
    if (fullCertificate?.appliedSchedules) {
      setSelectedScheduleIds(fullCertificate.appliedSchedules.map((s) => s.scheduleId));
    }
  }, [fullCertificate]);

  // Выбор занятий
  const toggleSchedule = (scheduleId: string) => {
    // Нельзя снять выбор с уже примененных занятий
    if (appliedScheduleIds.includes(scheduleId)) {
      return;
    }
    setSelectedScheduleIds((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const selectAllSchedules = () => {
    if (schedules) {
      setSelectedScheduleIds(schedules.map((s) => s.id));
    }
  };

  const deselectAllSchedules = () => {
    // Оставляем выбранными только уже примененные
    setSelectedScheduleIds(appliedScheduleIds);
  };

  // Отправка формы
  const onSubmit = async (data: FormData) => {
    if (!certificate || !data.startDate || !data.endDate) return;

    const updateData: UpdateMedicalCertificateDto = {
      startDate: format(data.startDate, 'yyyy-MM-dd'),
      endDate: format(data.endDate, 'yyyy-MM-dd'),
      notes: data.notes || undefined,
    };

    // Обновляем справку
    await updateMutation.mutateAsync({
      id: certificate.id,
      data: updateData,
    });

    // Применяем к новым выбранным занятиям
    const newScheduleIds = selectedScheduleIds.filter(
      (id) => !appliedScheduleIds.includes(id)
    );

    if (newScheduleIds.length > 0) {
      await applyMutation.mutateAsync({
        id: certificate.id,
        dto: { scheduleIds: newScheduleIds },
      });
    }

    onOpenChange(false);
  };

  const getClientFullName = () => {
    if (!certificate) return '';
    const { firstName, lastName, middleName } = certificate.client;
    return [lastName, firstName, middleName].filter(Boolean).join(' ');
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, 'HH:mm');
    } catch {
      return timeString;
    }
  };

  const openFile = () => {
    if (certificate?.fileUrl) {
      window.open(certificate.fileUrl, '_blank');
    }
  };

  const newSelectedCount = selectedScheduleIds.filter(
    (id) => !appliedScheduleIds.includes(id)
  ).length;

  if (!certificateProp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование справки</DialogTitle>
          <DialogDescription>
            Клиент: {getClientFullName()}
          </DialogDescription>
        </DialogHeader>

        {certificateLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Файл справки */}
          <div>
            <Label>Файл справки</Label>
            <div className="mt-2 border rounded-lg p-4 flex items-center gap-3 bg-muted/50">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {certificateProp?.fileName || 'Медицинская справка'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Загружена {certificateProp ? format(new Date(certificateProp.createdAt), 'dd.MM.yyyy в HH:mm', { locale: ru }) : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFile}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Открыть
              </Button>
            </div>
          </div>

          {/* Даты */}
          <div className="grid grid-cols-2 gap-4">
            {/* Дата начала */}
            <div>
              <Label>Дата начала болезни *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal mt-1',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd.MM.yyyy', { locale: ru }) : 'Выберите'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => setValue('startDate', date)}
                    locale={ru}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Дата окончания */}
            <div>
              <Label>Дата окончания болезни *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal mt-1',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd.MM.yyyy', { locale: ru }) : 'Выберите'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => setValue('endDate', date)}
                    locale={ru}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Примечания */}
          <div>
            <Label>Примечания</Label>
            <Textarea
              {...register('notes')}
              placeholder="Дополнительная информация..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Список занятий */}
          {startDate && endDate && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Занятия в период болезни</Label>
                {schedules && schedules.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllSchedules}
                    >
                      Выбрать все
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAllSchedules}
                    >
                      Снять выбор
                    </Button>
                  </div>
                )}
              </div>

              {schedulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : schedules && schedules.length > 0 ? (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Время</TableHead>
                        <TableHead>Группа</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule) => {
                        const isApplied = appliedScheduleIds.includes(schedule.id);
                        const isSelected = selectedScheduleIds.includes(schedule.id);

                        return (
                          <TableRow
                            key={schedule.id}
                            className={cn(
                              'cursor-pointer',
                              isSelected && 'bg-primary/5',
                              isApplied && 'bg-green-50'
                            )}
                            onClick={() => toggleSchedule(schedule.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                disabled={isApplied}
                                onCheckedChange={() => toggleSchedule(schedule.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {format(new Date(schedule.date), 'dd.MM.yyyy', { locale: ru })}
                            </TableCell>
                            <TableCell>
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </TableCell>
                            <TableCell>{schedule.group?.name || '—'}</TableCell>
                            <TableCell>
                              {isApplied ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Применено
                                </Badge>
                              ) : schedule.currentAttendance ? (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    attendanceStatusColors[schedule.currentAttendance.status]
                                  )}
                                >
                                  {attendanceStatusLabels[schedule.currentAttendance.status]}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Не отмечено</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <p>Занятий за указанный период не найдено</p>
                </div>
              )}

              {(appliedScheduleIds.length > 0 || newSelectedCount > 0) && (
                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                  {appliedScheduleIds.length > 0 && (
                    <p>Уже применено к занятиям: <strong>{appliedScheduleIds.length}</strong></p>
                  )}
                  {newSelectedCount > 0 && (
                    <p className="text-primary">Будет применено дополнительно: <strong>{newSelectedCount}</strong></p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!startDate || !endDate || updateMutation.isPending || applyMutation.isPending}
            >
              {(updateMutation.isPending || applyMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Сохранить
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
