'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAttendanceBySchedule, useMarkAttendance, useUpdateAttendance } from '@/hooks/use-attendance';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { Loader2, Check, X, AlertCircle, CheckCircle } from 'lucide-react';
import type { Attendance, AttendanceStatus } from '@/lib/types/attendance';
import { cn } from '@/lib/utils';

interface AttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  groupId: string;
  groupName: string;
  startTime: string;
}

interface ClientWithAttendance {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  subscription?: {
    id: string;
    type: 'UNLIMITED' | 'SINGLE_VISIT';
    remainingVisits?: number;
    status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';
    endDate: string;
  };
  attendance?: Attendance;
}

export function AttendanceSheet({
  open,
  onOpenChange,
  scheduleId,
  groupId,
  groupName,
  startTime,
}: AttendanceSheetProps) {
  const [clients, setClients] = useState<ClientWithAttendance[]>([]);

  const { data: attendances, isLoading: isLoadingAttendances } = useAttendanceBySchedule(scheduleId);
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useSubscriptions({ groupId });
  const markAttendance = useMarkAttendance();
  const updateAttendance = useUpdateAttendance();

  // Объединяем данные о клиентах из подписок и посещаемости
  useEffect(() => {
    if (!subscriptions || !attendances) return;

    // Создаём map посещаемости по clientId
    const attendanceMap = new Map<string, Attendance>();
    attendances.forEach((att) => {
      attendanceMap.set(att.clientId, att);
    });

    // Получаем уникальных клиентов из подписок
    const clientsData: ClientWithAttendance[] = subscriptions.data
      .map((sub) => ({
        id: sub.client.id,
        firstName: sub.client.firstName,
        lastName: sub.client.lastName,
        phone: sub.client.phone,
        subscription: {
          id: sub.id,
          type: sub.subscriptionType.type,
          remainingVisits: sub.remainingVisits,
          status: sub.status,
          endDate: sub.endDate,
        },
        attendance: attendanceMap.get(sub.client.id),
      }))
      // Фильтруем только активные абонементы
      .filter((client) => client.subscription?.status === 'ACTIVE');

    setClients(clientsData);
  }, [subscriptions, attendances]);

  const handleMarkAttendance = async (clientId: string, status: AttendanceStatus) => {
    const client = clients.find((c) => c.id === clientId);

    if (!client) return;

    if (client.attendance) {
      // Обновляем существующую отметку
      await updateAttendance.mutateAsync({
        id: client.attendance.id,
        data: { status },
      });
    } else {
      // Создаём новую отметку
      await markAttendance.mutateAsync({
        scheduleId,
        clientId,
        status,
      });
    }
  };

  const getAttendanceStats = () => {
    const present = clients.filter((c) => c.attendance?.status === 'PRESENT').length;
    const absent = clients.filter((c) => c.attendance?.status === 'ABSENT').length;
    const excused = clients.filter((c) => c.attendance?.status === 'EXCUSED').length;
    const notMarked = clients.filter((c) => !c.attendance).length;

    return { present, absent, excused, notMarked, total: clients.length };
  };

  const stats = getAttendanceStats();
  const isLoading = isLoadingAttendances || isLoadingSubscriptions;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Журнал посещаемости</SheetTitle>
          <SheetDescription>
            {groupName} • {new Date(startTime).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Статистика */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <div className="text-xs text-muted-foreground">Присутствуют</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-xs text-muted-foreground">Отсутствуют</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.excused}</div>
              <div className="text-xs text-muted-foreground">Уважительная</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.notMarked}</div>
              <div className="text-xs text-muted-foreground">Не отмечено</div>
            </div>
          </div>

          <Separator />

          {/* Список клиентов */}
          <div className="overflow-y-auto h-[calc(100vh-300px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Нет активных абонементов для этой группы
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <AttendanceRow
                    key={client.id}
                    client={client}
                    onMark={handleMarkAttendance}
                    isLoading={markAttendance.isPending || updateAttendance.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface AttendanceRowProps {
  client: ClientWithAttendance;
  onMark: (clientId: string, status: AttendanceStatus) => void;
  isLoading: boolean;
}

function AttendanceRow({ client, onMark, isLoading }: AttendanceRowProps) {
  const { subscription, attendance } = client;
  const subscriptionValid = subscription?.status === 'ACTIVE';
  const hasRemainingVisits =
    subscription?.type === 'UNLIMITED' ||
    (subscription?.remainingVisits && subscription.remainingVisits > 0);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium">
            {client.firstName} {client.lastName}
          </div>
          <div className="text-sm text-muted-foreground">{client.phone}</div>
        </div>

        {/* Статус абонемента */}
        <div className="flex items-center gap-2">
          {subscriptionValid && hasRemainingVisits ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Валиден
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <X className="h-3 w-3 mr-1" />
              Истёк
            </Badge>
          )}

          {subscription?.type === 'SINGLE_VISIT' && (
            <Badge variant="secondary">
              Осталось: {subscription.remainingVisits || 0}
            </Badge>
          )}
        </div>
      </div>

      {/* Кнопки отметки */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={attendance?.status === 'PRESENT' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            attendance?.status === 'PRESENT' && 'bg-green-600 hover:bg-green-700'
          )}
          onClick={() => onMark(client.id, 'PRESENT')}
          disabled={isLoading || !subscriptionValid || !hasRemainingVisits}
        >
          <Check className="h-4 w-4 mr-1" />
          Присутствует
        </Button>
        <Button
          size="sm"
          variant={attendance?.status === 'ABSENT' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            attendance?.status === 'ABSENT' && 'bg-red-600 hover:bg-red-700'
          )}
          onClick={() => onMark(client.id, 'ABSENT')}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1" />
          Отсутствует
        </Button>
        <Button
          size="sm"
          variant={attendance?.status === 'EXCUSED' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            attendance?.status === 'EXCUSED' && 'bg-yellow-600 hover:bg-yellow-700'
          )}
          onClick={() => onMark(client.id, 'EXCUSED')}
          disabled={isLoading}
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Уважительная
        </Button>
      </div>
    </div>
  );
}
