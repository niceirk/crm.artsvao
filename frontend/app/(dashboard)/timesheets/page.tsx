'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Minus,
  Pencil,
  FileText,
  Send,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTimesheet,
  useTimesheetStudios,
  useTimesheetGroups,
} from '@/hooks/use-timesheets';
import { CompensationEditDialog } from './components/compensation-edit-dialog';
import { CreateInvoicesDialog } from './components/create-invoices-dialog';
import { AttendanceSheet } from '@/app/(dashboard)/schedule/attendance-sheet';
import { useMarkAttendance, useUpdateAttendance } from '@/hooks/use-attendance';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createBulkInvoices, timesheetsApi } from '@/lib/api/timesheets';
import type { TimesheetClient, TimesheetScheduleDate, TimesheetAttendance } from '@/lib/types/timesheets';
import type { AttendanceStatus } from '@/lib/types/attendance';

// Мемоизированный форматер денег (создаётся один раз)
const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const formatMoney = (amount: number) => moneyFormatter.format(amount);

// Мемоизированные иконки статуса
const StatusIcon = memo(function StatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case 'PRESENT':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'ABSENT':
      return <X className="h-4 w-4 text-red-600" />;
    case 'EXCUSED':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
});

// Мемоизированная ячейка посещаемости
const AttendanceCell = memo(function AttendanceCell({
  clientId,
  attendance,
  isLoading,
  onStatusChange,
}: {
  clientId: string;
  attendance: TimesheetAttendance;
  isLoading: boolean;
  onStatusChange: (clientId: string, attendance: TimesheetAttendance, status: AttendanceStatus) => void;
}) {
  return (
    <TableCell className="text-center p-1">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center justify-center h-8 w-8 mx-auto rounded cursor-pointer transition-colors hover:ring-2 hover:ring-primary/20',
              attendance.status === 'PRESENT' && 'bg-green-50',
              attendance.status === 'ABSENT' && 'bg-red-50',
              attendance.status === 'EXCUSED' && 'bg-orange-50',
              !attendance.status && 'hover:bg-muted'
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <StatusIcon status={attendance.status} />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" align="center">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={attendance.status === 'PRESENT' ? 'default' : 'ghost'}
              className={cn(
                'h-8 px-2',
                attendance.status === 'PRESENT' && 'bg-green-600 hover:bg-green-700'
              )}
              onClick={() => onStatusChange(clientId, attendance, 'PRESENT')}
              disabled={isLoading}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={attendance.status === 'ABSENT' ? 'default' : 'ghost'}
              className={cn(
                'h-8 px-2',
                attendance.status === 'ABSENT' && 'bg-red-600 hover:bg-red-700'
              )}
              onClick={() => onStatusChange(clientId, attendance, 'ABSENT')}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={attendance.status === 'EXCUSED' ? 'default' : 'ghost'}
              className={cn(
                'h-8 px-2',
                attendance.status === 'EXCUSED' && 'bg-orange-500 hover:bg-orange-600'
              )}
              onClick={() => onStatusChange(clientId, attendance, 'EXCUSED')}
              disabled={isLoading}
            >
              <AlertCircle className="h-4 w-4" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </TableCell>
  );
});

export default function TimesheetsPage() {
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() =>
    format(new Date(), 'yyyy-MM')
  );
  const [editingCompensation, setEditingCompensation] = useState<{
    client: TimesheetClient;
  } | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<TimesheetScheduleDate | null>(null);
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [isCreatingInvoices, setIsCreatingInvoices] = useState(false);

  const queryClient = useQueryClient();
  const markAttendance = useMarkAttendance();
  const updateAttendance = useUpdateAttendance();

  const { data: studios, isLoading: studiosLoading } = useTimesheetStudios();
  const { data: groups, isLoading: groupsLoading } = useTimesheetGroups(
    selectedStudioId || undefined
  );

  const { data: timesheet, isLoading: timesheetLoading } = useTimesheet({
    groupId: selectedGroupId,
    month: selectedMonth,
  });

  // Парсинг текущего месяца для навигации
  const currentMonthDate = useMemo(
    () => parse(selectedMonth, 'yyyy-MM', new Date()),
    [selectedMonth]
  );

  // Разделение клиентов на группы по типу подписки
  const { subscriptionClients, singleVisitClients } = useMemo(() => {
    if (!timesheet?.clients) {
      return { subscriptionClients: [], singleVisitClients: [] };
    }
    const subscription: typeof timesheet.clients = [];
    const singleVisit: typeof timesheet.clients = [];

    timesheet.clients.forEach(client => {
      if (client.subscription?.type === 'SINGLE_VISIT') {
        singleVisit.push(client);
      } else {
        subscription.push(client);
      }
    });

    return { subscriptionClients: subscription, singleVisitClients: singleVisit };
  }, [timesheet?.clients]);

  // Получить выбранных клиентов с абонементами (только они могут получить счет)
  const selectedClientsWithSubscription = useMemo(() => {
    return subscriptionClients.filter(c =>
      selectedClientIds.has(c.id) && c.subscription !== null
    );
  }, [subscriptionClients, selectedClientIds]);

  // Функции для работы с выбором
  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const toggleAllSubscriptionClients = () => {
    if (selectedClientIds.size === subscriptionClients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(subscriptionClients.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedClientIds(new Set());
  };

  // Обработчик создания счетов
  const handleCreateInvoices = async (params: {
    clientIds: string[];
    groupId: string;
    targetMonth: string;
    sendNotifications: boolean;
  }) => {
    setIsCreatingInvoices(true);
    try {
      const result = await createBulkInvoices(params);
      toast.success(
        `Создано счетов: ${result.created}${
          params.sendNotifications ? `, отправлено уведомлений: ${result.notificationsSent}` : ''
        }`
      );
      setShowInvoiceDialog(false);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при создании счетов');
    } finally {
      setIsCreatingInvoices(false);
    }
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(format(subMonths(currentMonthDate, 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    setSelectedMonth(format(addMonths(currentMonthDate, 1), 'yyyy-MM'));
  };

  const handleStudioChange = (value: string) => {
    setSelectedStudioId(value === 'all' ? '' : value);
    setSelectedGroupId('');
  };

  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value);
  };


  // Обработчик изменения статуса посещения с оптимистичным обновлением
  const handleStatusChange = useCallback(async (
    clientId: string,
    attendance: TimesheetAttendance,
    newStatus: AttendanceStatus
  ) => {
    const cellKey = `${clientId}-${attendance.scheduleId}`;
    setPendingCell(cellKey);

    // Оптимистичное обновление кэша
    const queryKey = ['timesheets', 'timesheet', { groupId: selectedGroupId, month: selectedMonth }];
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        clients: old.clients.map((client: TimesheetClient) => {
          if (client.id !== clientId) return client;
          return {
            ...client,
            attendances: client.attendances.map((att: TimesheetAttendance) => {
              if (att.scheduleId !== attendance.scheduleId) return att;
              return { ...att, status: newStatus };
            }),
          };
        }),
      };
    });

    try {
      if (attendance.attendanceId) {
        await updateAttendance.mutateAsync({
          id: attendance.attendanceId,
          data: { status: newStatus },
        });
      } else {
        await markAttendance.mutateAsync({
          scheduleId: attendance.scheduleId,
          clientId,
          status: newStatus,
        });
      }
      // Инвалидируем только после успешного обновления (для синхронизации с сервером)
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    } catch (error) {
      // Откатываем при ошибке
      queryClient.setQueryData(queryKey, previousData);
      toast.error('Ошибка при обновлении посещаемости');
    } finally {
      setPendingCell(null);
    }
  }, [selectedGroupId, selectedMonth, queryClient, updateAttendance, markAttendance]);


  return (
    <div className="space-y-4">
      {/* Компактные фильтры */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
        <Select
          value={selectedStudioId || 'all'}
          onValueChange={handleStudioChange}
          disabled={studiosLoading}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Все студии" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все студии</SelectItem>
            {studios?.map((studio) => (
              <SelectItem key={studio.id} value={studio.id}>
                {studio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedGroupId}
          onValueChange={handleGroupChange}
          disabled={groupsLoading || !groups?.length}
        >
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
                {!selectedStudioId && (
                  <span className="ml-2 text-muted-foreground text-xs">
                    ({group.studio.name})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-[130px] text-center font-medium text-sm">
            {format(currentMonthDate, 'LLLL yyyy', { locale: ru })}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {selectedGroupId && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={async () => {
              try {
                await timesheetsApi.exportToExcel({
                  groupId: selectedGroupId,
                  month: selectedMonth,
                });
                toast.success('Табель экспортирован');
              } catch (error) {
                toast.error('Ошибка при экспорте табеля');
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        )}
      </div>

      {/* Таблица табеля */}
      {!selectedGroupId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Выберите группу для просмотра табеля
            </p>
          </CardContent>
        </Card>
      ) : timesheetLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : timesheet ? (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                {timesheet.group.name}
              </CardTitle>
              {/* Легенда */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-green-50">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-muted-foreground">Был</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-red-50">
                    <X className="h-3 w-3 text-red-600" />
                  </div>
                  <span className="text-muted-foreground">Нет</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-orange-50">
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                  </div>
                  <span className="text-muted-foreground">Уваж.</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-right">
                <div>Всего занятий: <span className="font-medium text-foreground">{timesheet.totals.totalSchedules}</span></div>
                <div>Всего компенсаций: <span className="font-bold text-orange-600">{formatMoney(timesheet.totals.totalCompensation)}</span></div>
              </div>
            </div>
          </CardHeader>

          {/* Панель действий при выделении */}
          {selectedClientIds.size > 0 && (
            <div className="mx-6 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Выбрано клиентов: {selectedClientsWithSubscription.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-muted-foreground"
                >
                  Снять выделение
                </Button>
              </div>
              <Button
                onClick={() => setShowInvoiceDialog(true)}
                disabled={selectedClientsWithSubscription.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Сформировать счета
              </Button>
            </div>
          )}

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background w-[40px] text-center">
                      <Checkbox
                        checked={subscriptionClients.length > 0 && selectedClientIds.size === subscriptionClients.length}
                        onCheckedChange={toggleAllSubscriptionClients}
                        aria-label="Выбрать все"
                      />
                    </TableHead>
                    <TableHead className="sticky left-[40px] z-10 bg-background min-w-[200px]">
                      Клиент
                    </TableHead>
                    {timesheet.scheduleDates.map((date) => (
                      <TableHead
                        key={date.scheduleId}
                        className="text-center min-w-[60px] p-1"
                      >
                        <button
                          onClick={() => setSelectedSchedule(date)}
                          className="w-full rounded px-1 py-0.5 hover:bg-muted transition-colors cursor-pointer"
                          title="Открыть журнал занятия"
                        >
                          <div className="text-xs font-medium">
                            {format(new Date(date.date), 'd')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {date.dayOfWeek}
                          </div>
                        </button>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[60px]">
                      Был
                    </TableHead>
                    <TableHead className="text-center min-w-[60px]">
                      Ув.
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      Компенсация
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      Счет
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Клиенты по абонементам */}
                  {subscriptionClients.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50">
                        <TableCell className="sticky left-0 z-10 bg-muted/50 w-[40px]" />
                        <TableCell className="sticky left-[40px] z-10 bg-muted/50 font-semibold text-sm py-2">
                          По абонементам ({subscriptionClients.length})
                        </TableCell>
                        <TableCell colSpan={timesheet.scheduleDates.length + 5} />
                      </TableRow>
                      {subscriptionClients.map((client) => (
                        <TableRow
                          key={client.id}
                          className={cn(selectedClientIds.has(client.id) && 'bg-primary/5')}
                        >
                          <TableCell className="sticky left-0 z-10 bg-background text-center">
                            <Checkbox
                              checked={selectedClientIds.has(client.id)}
                              onCheckedChange={() => toggleClientSelection(client.id)}
                              aria-label={`Выбрать ${client.lastName} ${client.firstName}`}
                            />
                          </TableCell>
                          <TableCell className="sticky left-[40px] z-10 bg-background">
                            <Link
                              href={`/clients/${client.id}`}
                              target="_blank"
                              className="font-medium hover:text-primary transition-colors"
                              style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#a1a1aa', textDecorationThickness: '1px', textUnderlineOffset: '3px' }}
                            >
                              {client.lastName} {client.firstName}
                            </Link>
                          </TableCell>
                          {client.attendances.map((attendance) => (
                            <AttendanceCell
                              key={attendance.scheduleId}
                              clientId={client.id}
                              attendance={attendance}
                              isLoading={pendingCell === `${client.id}-${attendance.scheduleId}`}
                              onStatusChange={handleStatusChange}
                            />
                          ))}
                          <TableCell className="text-center text-green-600 font-medium">
                            {client.summary.present}
                          </TableCell>
                          <TableCell className="text-center text-orange-600 font-medium">
                            {client.summary.excused}
                          </TableCell>
                          <TableCell className="text-center">
                            {(client.compensation.excusedCount > 0 || (client.compensation.medCertCompensation ?? 0) > 0) ? (
                              <div>
                                <div
                                  className={cn(
                                    'font-medium',
                                    client.compensation.adjustedAmount !== null
                                      ? 'text-blue-600'
                                      : 'text-orange-600'
                                  )}
                                >
                                  {formatMoney(
                                    client.compensation.adjustedAmount ??
                                      client.compensation.calculatedAmount
                                  )}
                                </div>
                                {/* Показываем разбивку если есть перенесённая компенсация из справок */}
                                {(client.compensation.medCertCompensation ?? 0) > 0 && (
                                  <div className="text-[10px] text-muted-foreground">
                                    <span title="Текущий месяц">{formatMoney(client.compensation.baseCalculatedAmount ?? 0)}</span>
                                    {' + '}
                                    <span className="text-purple-600" title="Перенесено из справок">{formatMoney(client.compensation.medCertCompensation ?? 0)}</span>
                                  </div>
                                )}
                                {client.compensation.adjustedAmount !== null && (
                                  <div className="text-xs text-muted-foreground line-through">
                                    {formatMoney(
                                      client.compensation.calculatedAmount
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {client.nextMonthInvoice !== null ? (
                              <div>
                                <div className="font-medium text-green-600">
                                  {formatMoney(client.nextMonthInvoice)}
                                </div>
                                {client.benefitDiscount && (
                                  <div className="text-xs text-muted-foreground">
                                    -{client.benefitDiscount}%
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {client.compensation.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setEditingCompensation({ client })
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Клиенты по разовым посещениям */}
                  {singleVisitClients.length > 0 && (
                    <>
                      <TableRow className="bg-blue-50/50">
                        <TableCell className="sticky left-0 z-10 bg-blue-50/50 w-[40px]" />
                        <TableCell className="sticky left-[40px] z-10 bg-blue-50/50 font-semibold text-sm py-2">
                          По разовым посещениям ({singleVisitClients.length})
                        </TableCell>
                        <TableCell colSpan={timesheet.scheduleDates.length + 5} />
                      </TableRow>
                      {singleVisitClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="sticky left-0 z-10 bg-background text-center">
                            {/* Чекбокс отключен для разовых посещений */}
                          </TableCell>
                          <TableCell className="sticky left-[40px] z-10 bg-background">
                            <Link
                              href={`/clients/${client.id}`}
                              target="_blank"
                              className="font-medium hover:text-primary transition-colors"
                              style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#a1a1aa', textDecorationThickness: '1px', textUnderlineOffset: '3px' }}
                            >
                              {client.lastName} {client.firstName}
                            </Link>
                          </TableCell>
                          {client.attendances.map((attendance) => (
                            <AttendanceCell
                              key={attendance.scheduleId}
                              clientId={client.id}
                              attendance={attendance}
                              isLoading={pendingCell === `${client.id}-${attendance.scheduleId}`}
                              onStatusChange={handleStatusChange}
                            />
                          ))}
                          <TableCell className="text-center text-green-600 font-medium">
                            {client.summary.present}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            —
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            —
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            —
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}


      {/* Диалог редактирования компенсации */}
      <CompensationEditDialog
        open={!!editingCompensation}
        onOpenChange={(open) => !open && setEditingCompensation(null)}
        client={editingCompensation?.client || null}
      />

      {/* Диалог формирования счетов */}
      <CreateInvoicesDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        clients={selectedClientsWithSubscription}
        groupId={selectedGroupId}
        currentMonth={selectedMonth}
        onCreateInvoices={handleCreateInvoices}
        isLoading={isCreatingInvoices}
      />

      {/* Журнал посещаемости занятия */}
      {selectedSchedule && timesheet && (
        <AttendanceSheet
          open={!!selectedSchedule}
          onOpenChange={(open) => !open && setSelectedSchedule(null)}
          scheduleId={selectedSchedule.scheduleId}
          groupId={selectedGroupId}
          groupName={timesheet.group.name}
          startTime={selectedSchedule.startTime}
          scheduleDate={selectedSchedule.date}
        />
      )}
    </div>
  );
}
