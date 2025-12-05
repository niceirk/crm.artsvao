'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addMonths, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CalendarIcon,
  Upload,
  FileText,
  X,
  Check,
  Loader2,
  ArrowLeft,
  FileHeart,
  Save,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { ClientSearch } from '@/components/clients/client-search';
import { useCreateMedicalCertificate, usePreviewSchedules } from '@/hooks/use-medical-certificates';
import { SchedulePreview, CompensationMonthDto } from '@/lib/types/medical-certificates';
import { AttendanceSheet } from '../../schedule/attendance-sheet';
import { SubscriptionPreviewSheet } from '../components/subscription-preview-sheet';

// Форматирование суммы
const formatMoney = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Генерация списка месяцев для выбора
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i <= 6; i++) {
    const date = addMonths(now, i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'LLLL yyyy', { locale: ru });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
};

// Тип для группировки по абонементам
interface SubscriptionGroup {
  subscriptionId: string;
  subscriptionName: string;
  validMonth: string;
  scheduleCount: number;
  totalCompensation: number;
  scheduleIds: string[];
}

interface FormData {
  clientId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  notes: string;
}

const attendanceStatusIcons: Record<string, { icon: React.ElementType; color: string; title: string }> = {
  PRESENT: { icon: CheckCircle2, color: 'text-green-600', title: 'Присутствовал' },
  ABSENT: { icon: XCircle, color: 'text-red-500', title: 'Отсутствовал' },
  EXCUSED: { icon: Clock, color: 'text-yellow-600', title: 'Уважительная причина' },
};

export default function NewMedicalCertificatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultClientId = searchParams.get('clientId') || '';

  const [file, setFile] = useState<File | null>(null);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [compensationMonths, setCompensationMonths] = useState<Record<string, string>>({});

  // Состояния для слайдеров
  const [attendanceSheetOpen, setAttendanceSheetOpen] = useState(false);
  const [selectedScheduleForSheet, setSelectedScheduleForSheet] = useState<SchedulePreview | null>(null);
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      clientId: defaultClientId,
      startDate: undefined,
      endDate: undefined,
      notes: '',
    },
  });

  const clientId = watch('clientId');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const createMutation = useCreateMedicalCertificate();

  // Запрос занятий клиента
  const { data: schedules, isLoading: schedulesLoading } = usePreviewSchedules(
    clientId,
    startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
  );

  // Получить уникальные студии из занятий
  const studios = useMemo(() => {
    if (!schedules) return [];
    const uniqueStudios = new Map<string, { id: string; name: string }>();
    schedules.forEach((s) => {
      if (s.group?.studio) {
        uniqueStudios.set(s.group.studio.id, s.group.studio);
      }
    });
    return Array.from(uniqueStudios.values());
  }, [schedules]);

  // Фильтрованные занятия по студии
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (!selectedStudioId) return schedules;
    return schedules.filter((s) => s.group?.studio?.id === selectedStudioId);
  }, [schedules, selectedStudioId]);

  // Группировка выбранных занятий по абонементам
  const groupedBySubscription = useMemo(() => {
    if (!schedules || selectedScheduleIds.length === 0) return [];

    const groups = new Map<string, SubscriptionGroup>();

    selectedScheduleIds.forEach((scheduleId) => {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (!schedule?.subscription) return;

      const subId = schedule.subscription.id;
      const existing = groups.get(subId);

      if (existing) {
        existing.scheduleCount++;
        existing.totalCompensation += schedule.compensationAmount || 0;
        existing.scheduleIds.push(scheduleId);
      } else {
        groups.set(subId, {
          subscriptionId: subId,
          subscriptionName: schedule.subscription.name,
          validMonth: schedule.subscription.validMonth,
          scheduleCount: 1,
          totalCompensation: schedule.compensationAmount || 0,
          scheduleIds: [scheduleId],
        });
      }
    });

    return Array.from(groups.values());
  }, [schedules, selectedScheduleIds]);

  // Установить clientId из URL при монтировании
  useEffect(() => {
    if (defaultClientId) {
      setValue('clientId', defaultClientId);
    }
  }, [defaultClientId, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  // Выбор занятий
  const toggleSchedule = (scheduleId: string) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const selectAllSchedules = () => {
    if (filteredSchedules) {
      setSelectedScheduleIds((prev) => {
        const newIds = filteredSchedules.map((s) => s.id);
        return Array.from(new Set([...prev, ...newIds]));
      });
    }
  };

  const deselectAllSchedules = () => {
    if (filteredSchedules) {
      const filteredIds = new Set(filteredSchedules.map((s) => s.id));
      setSelectedScheduleIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    }
  };

  // Обработчик изменения месяца компенсации
  const handleCompensationMonthChange = (subscriptionId: string, month: string) => {
    setCompensationMonths((prev) => ({
      ...prev,
      [subscriptionId]: month,
    }));
  };

  // Отправка формы
  const onSubmit = async (data: FormData) => {
    if (!data.startDate || !data.endDate) return;

    // Формируем данные о месяцах компенсации
    const compensationMonthsData: CompensationMonthDto[] = Object.entries(compensationMonths)
      .filter(([_, month]) => month)
      .map(([subscriptionId, compensationMonth]) => ({
        subscriptionId,
        compensationMonth,
      }));

    await createMutation.mutateAsync({
      file: file || undefined,
      data: {
        clientId: data.clientId,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        notes: data.notes || undefined,
        scheduleIds: selectedScheduleIds.length > 0 ? selectedScheduleIds : undefined,
        compensationMonths: compensationMonthsData.length > 0 ? compensationMonthsData : undefined,
      },
    });

    router.push('/medical-certificates');
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '—';
    try {
      // Если это ISO дата (содержит T), парсим как Date и извлекаем время в UTC
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        // Используем UTC время, так как Prisma сериализует @db.Time в UTC
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      // Если это время в формате HH:mm:ss или HH:mm
      if (timeString.includes(':')) {
        return timeString.substring(0, 5);
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  return (
    <div className="flex-1 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileHeart className="h-7 w-7" />
            Добавить справку
          </h2>
          <p className="text-muted-foreground">
            Загрузите медицинскую справку и выберите занятия для применения статуса "Уважительная причина"
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Данные справки</CardTitle>
            <CardDescription>
              Заполните информацию о медицинской справке
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Клиент и даты в одну строку */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Выбор клиента */}
              <div>
                <Label className="flex items-center gap-1">
                  Клиент
                  <span className="text-yellow-600">*</span>
                </Label>
                <ClientSearch
                  value={clientId || undefined}
                  onValueChange={(value) => setValue('clientId', value ?? '')}
                  placeholder="Поиск клиента..."
                />
              </div>

              {/* Дата начала */}
              <div>
                <Label className="flex items-center gap-1">
                  Дата начала болезни
                  <span className="text-yellow-600">*</span>
                </Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd.MM.yyyy', { locale: ru }) : 'Выберите дату'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setValue('startDate', date);
                        setStartDateOpen(false);
                      }}
                      locale={ru}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Дата окончания */}
              <div>
                <Label className="flex items-center gap-1">
                  Дата окончания болезни
                  <span className="text-yellow-600">*</span>
                </Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd.MM.yyyy', { locale: ru }) : 'Выберите дату'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setValue('endDate', date);
                        setEndDateOpen(false);
                      }}
                      locale={ru}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Список занятий - выше файла */}
            {clientId && startDate && endDate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
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

                {/* Фильтр по студиям */}
                {studios.length > 1 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      Студия:
                    </span>
                    <button
                      type="button"
                      className={cn(
                        'text-sm underline underline-offset-2 transition-colors',
                        !selectedStudioId ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setSelectedStudioId(null)}
                    >
                      Все студии
                    </button>
                    {studios.map((studio) => (
                      <button
                        key={studio.id}
                        type="button"
                        className={cn(
                          'text-sm underline underline-offset-2 transition-colors',
                          selectedStudioId === studio.id ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={() => setSelectedStudioId(studio.id)}
                      >
                        {studio.name}
                      </button>
                    ))}
                  </div>
                )}

                {schedulesLoading ? (
                  <div className="flex items-center justify-center py-8 border rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSchedules && filteredSchedules.length > 0 ? (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  filteredSchedules.length > 0 &&
                                  filteredSchedules.every((s) => selectedScheduleIds.includes(s.id))
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    selectAllSchedules();
                                  } else {
                                    deselectAllSchedules();
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>Дата</TableHead>
                            <TableHead>Время</TableHead>
                            <TableHead>Группа</TableHead>
                            <TableHead>Абонемент</TableHead>
                            <TableHead className="text-right">Компенсация</TableHead>
                            <TableHead className="w-10 text-center">Статус</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSchedules.map((schedule) => {
                            const statusInfo = schedule.currentAttendance
                              ? attendanceStatusIcons[schedule.currentAttendance.status]
                              : null;
                            const StatusIcon = statusInfo?.icon;

                            return (
                              <TableRow
                                key={schedule.id}
                                className={cn(
                                  'cursor-pointer',
                                  selectedScheduleIds.includes(schedule.id) && 'bg-primary/5'
                                )}
                                onClick={() => toggleSchedule(schedule.id)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedScheduleIds.includes(schedule.id)}
                                    onCheckedChange={() => toggleSchedule(schedule.id)}
                                  />
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="text-primary hover:underline text-left"
                                    onClick={() => {
                                      setSelectedScheduleForSheet(schedule);
                                      setAttendanceSheetOpen(true);
                                    }}
                                  >
                                    {format(new Date(schedule.date), 'dd.MM.yyyy (EEEEEE)', { locale: ru })}
                                  </button>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="text-primary hover:underline"
                                    onClick={() => {
                                      setSelectedScheduleForSheet(schedule);
                                      setAttendanceSheetOpen(true);
                                    }}
                                  >
                                    {formatTime(schedule.startTime)} — {formatTime(schedule.endTime)}
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div>{schedule.group?.name || '—'}</div>
                                    {schedule.group?.studio && (
                                      <div className="text-xs text-muted-foreground">
                                        {schedule.group.studio.name}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {schedule.subscription ? (
                                    <button
                                      type="button"
                                      className="text-primary hover:underline text-sm text-left"
                                      onClick={() => {
                                        setSelectedSubscriptionId(schedule.subscription!.id);
                                        setSubscriptionSheetOpen(true);
                                      }}
                                    >
                                      Абонемент, {format(parseISO(schedule.subscription.purchaseDate), 'dd.MM.yyyy')}
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {schedule.compensationAmount ? (
                                    <span className="font-medium text-orange-600">
                                      {formatMoney(schedule.compensationAmount)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {statusInfo && StatusIcon ? (
                                    <span title={statusInfo.title}>
                                      <StatusIcon
                                        className={cn('h-5 w-5 mx-auto', statusInfo.color)}
                                      />
                                    </span>
                                  ) : (
                                    <span title="Не отмечено">
                                      <HelpCircle
                                        className="h-5 w-5 mx-auto text-muted-foreground"
                                      />
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {selectedScheduleIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Выбрано занятий: <strong>{selectedScheduleIds.length}</strong>
                      </p>
                    )}
                  </>
                ) : schedules && schedules.length > 0 ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg">
                    <p>Нет занятий для выбранной студии</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg">
                    <p>Занятий за указанный период не найдено</p>
                    <p className="text-sm mt-1">
                      Убедитесь, что клиент является участником группы
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Блок выбора месяца компенсации */}
            {groupedBySubscription.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-orange-600" />
                    Месяц применения компенсации
                  </CardTitle>
                  <CardDescription>
                    Укажите в каком месяце учесть компенсацию для каждого абонемента
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedBySubscription.map((group) => {
                    // Форматируем validMonth (2025-12) в "декабрь 2025"
                    const formatValidMonth = (validMonth: string) => {
                      if (!validMonth) return '';
                      const [year, month] = validMonth.split('-');
                      const date = new Date(Number(year), Number(month) - 1, 1);
                      const monthName = format(date, 'LLLL yyyy', { locale: ru });
                      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
                    };

                    return (
                      <div key={group.subscriptionId} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-medium">
                            {group.subscriptionName}
                            {group.validMonth && (
                              <span className="text-muted-foreground font-normal ml-2">
                                ({formatValidMonth(group.validMonth)})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {group.scheduleCount} занятий, {formatMoney(group.totalCompensation)}
                          </div>
                        </div>
                      <Select
                        value={compensationMonths[group.subscriptionId] || ''}
                        onValueChange={(value) => handleCompensationMonthChange(group.subscriptionId, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Выберите месяц" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Загрузка файла справки */}
            <div className="space-y-2">
              <Label>Файл справки (необязательно)</Label>
              {file ? (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 border-green-200">
                  <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} КБ
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                  />
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Перетащите файл сюда или нажмите для выбора
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Поддерживаются изображения и PDF
                  </p>
                </div>
              )}
            </div>

            {/* Примечания */}
            <div>
              <Label>Примечания</Label>
              <Textarea
                {...register('notes')}
                placeholder="Дополнительная информация..."
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Кнопки действий */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={!clientId || !startDate || !endDate || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Создать и применить
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Слайдер журнала посещаемости */}
      {selectedScheduleForSheet && (
        <AttendanceSheet
          open={attendanceSheetOpen}
          onOpenChange={setAttendanceSheetOpen}
          scheduleId={selectedScheduleForSheet.id}
          groupId={selectedScheduleForSheet.group?.id || ''}
          groupName={selectedScheduleForSheet.group?.name || ''}
          startTime={selectedScheduleForSheet.startTime}
          scheduleDate={selectedScheduleForSheet.date}
        />
      )}

      {/* Слайдер деталей абонемента */}
      <SubscriptionPreviewSheet
        subscriptionId={selectedSubscriptionId}
        open={subscriptionSheetOpen}
        onOpenChange={setSubscriptionSheetOpen}
      />
    </div>
  );
}
