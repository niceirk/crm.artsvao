'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  RefreshCw,
  XCircle,
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  useNotifications,
  useCancelNotification,
  useRetryNotification,
} from '@/hooks/use-notifications';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationEventType,
  NotificationQuery,
  STATUS_LABELS,
  CHANNEL_LABELS,
  EVENT_TYPE_LABELS,
} from '@/lib/types/notifications';

export function HistoryTab() {
  const [filters, setFilters] = useState<NotificationQuery>({
    page: 1,
    limit: 20,
  });
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const { data, isLoading, refetch } = useNotifications(filters);
  const cancelNotification = useCancelNotification();
  const retryNotification = useRetryNotification();

  const getStatusBadge = (status: NotificationStatus) => {
    const variants: Record<NotificationStatus, string> = {
      [NotificationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [NotificationStatus.PROCESSING]: 'bg-blue-100 text-blue-800',
      [NotificationStatus.SENT]: 'bg-green-100 text-green-800',
      [NotificationStatus.FAILED]: 'bg-red-100 text-red-800',
      [NotificationStatus.CANCELED]: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={variants[status]} variant="outline">
        {STATUS_LABELS[status]}
      </Badge>
    );
  };

  const getChannelBadge = (channel: NotificationChannel) => {
    return channel === NotificationChannel.TELEGRAM ? (
      <Badge variant="default">TG</Badge>
    ) : (
      <Badge variant="secondary">Email</Badge>
    );
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleCancel = (id: string) => {
    cancelNotification.mutate(id);
  };

  const handleRetry = (id: string) => {
    retryNotification.mutate(id);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>История уведомлений</CardTitle>
              <CardDescription>
                Всего: {data?.meta.total || 0} уведомлений
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Фильтры */}
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Поиск по адресу..."
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value || undefined,
                    page: 1,
                  }))
                }
              />
            </div>

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status:
                    value === 'all'
                      ? undefined
                      : (value as NotificationStatus),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.channel || 'all'}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  channel:
                    value === 'all'
                      ? undefined
                      : (value as NotificationChannel),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Канал" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все каналы</SelectItem>
                {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.eventType || 'all'}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  eventType:
                    value === 'all'
                      ? undefined
                      : (value as NotificationEventType),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Тип события" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Таблица */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !data?.data.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Уведомления не найдены
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Канал</TableHead>
                    <TableHead>Получатель</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(
                          new Date(notification.createdAt),
                          'dd.MM.yyyy HH:mm',
                          { locale: ru }
                        )}
                      </TableCell>
                      <TableCell>
                        {getChannelBadge(notification.channel)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {notification.recipient ? (
                            <span>
                              {notification.recipient.firstName}{' '}
                              {notification.recipient.lastName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">
                              {notification.recipientAddress}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {EVENT_TYPE_LABELS[notification.eventType]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(notification.status)}
                        {notification.attempts > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (попытка {notification.attempts})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedNotification(notification)}
                            title="Подробнее"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {notification.status === NotificationStatus.PENDING && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(notification.id)}
                              title="Отменить"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {notification.status === NotificationStatus.FAILED && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetry(notification.id)}
                              title="Повторить"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Пагинация */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Страница {data.meta.page} из {data.meta.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.meta.page - 1)}
                    disabled={data.meta.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.meta.page + 1)}
                    disabled={data.meta.page >= data.meta.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Диалог деталей */}
      <Dialog
        open={!!selectedNotification}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Детали уведомления</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Статус</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedNotification.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Канал</label>
                  <div className="mt-1">
                    {getChannelBadge(selectedNotification.channel)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Получатель</label>
                <div className="mt-1">
                  {selectedNotification.recipient ? (
                    <div>
                      {selectedNotification.recipient.firstName}{' '}
                      {selectedNotification.recipient.lastName}
                      <div className="text-sm text-muted-foreground">
                        {selectedNotification.recipientAddress}
                      </div>
                    </div>
                  ) : (
                    <span className="font-mono text-sm">
                      {selectedNotification.recipientAddress}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Тип события</label>
                <div className="mt-1">
                  {EVENT_TYPE_LABELS[selectedNotification.eventType]}
                </div>
              </div>

              {selectedNotification.template && (
                <div>
                  <label className="text-sm font-medium">Шаблон</label>
                  <div className="mt-1">
                    {selectedNotification.template.name}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({selectedNotification.template.code})
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Создано</label>
                  <div className="mt-1 text-sm">
                    {format(
                      new Date(selectedNotification.createdAt),
                      'dd.MM.yyyy HH:mm:ss',
                      { locale: ru }
                    )}
                  </div>
                </div>
                {selectedNotification.sentAt && (
                  <div>
                    <label className="text-sm font-medium">Отправлено</label>
                    <div className="mt-1 text-sm">
                      {format(
                        new Date(selectedNotification.sentAt),
                        'dd.MM.yyyy HH:mm:ss',
                        { locale: ru }
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Попытки</label>
                <div className="mt-1">
                  {selectedNotification.attempts} из{' '}
                  {selectedNotification.maxAttempts}
                </div>
              </div>

              {selectedNotification.lastError && (
                <div>
                  <label className="text-sm font-medium text-destructive">
                    Ошибка
                  </label>
                  <div className="mt-1 p-2 bg-destructive/10 rounded text-sm text-destructive">
                    {selectedNotification.lastError}
                  </div>
                </div>
              )}

              {selectedNotification.payload && (
                <div>
                  <label className="text-sm font-medium">Данные</label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedNotification.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
