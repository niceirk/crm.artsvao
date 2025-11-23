'use client';

import { useMemo, useState, useEffect, useRef, type JSX } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useAttendanceBySchedule, useMarkAttendance, useUpdateAttendance, useDeleteAttendance } from '@/hooks/use-attendance';
import { groupsApi } from '@/lib/api/groups';
import { Loader2, Check, X, AlertCircle, Trash2 } from 'lucide-react';
import type { Attendance, AttendanceStatus } from '@/lib/types/attendance';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/utils/toast';
import { getClients, type Client } from '@/lib/api/clients';

interface AttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  groupId: string;
  groupName: string;
  startTime: string;
  scheduleDate: string;
}

interface MemberWithAttendance {
  id: string;
  memberId?: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone: string;
  joinedAt?: string | null;
  promotedFromWaitlistAt?: string | null;
  attendance?: Attendance;
  isGuest?: boolean;
}

export function AttendanceSheet({
  open,
  onOpenChange,
  scheduleId,
  groupId,
  groupName,
  startTime,
  scheduleDate,
}: AttendanceSheetProps) {
  const [members, setMembers] = useState<MemberWithAttendance[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStatus, setSelectedStatus] =
    useState<AttendanceStatus>('PRESENT');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const comboboxTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteAttendance = useDeleteAttendance();
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'status'>('name');
  const clientOptions: ComboboxOption[] = useMemo(() => {
    return clients.map((client) => ({
      value: client.id,
      label: `${client.lastName} ${client.firstName}${client.middleName ? ` ${client.middleName}` : ''} (${client.phone})`,
    }));
  }, [clients]);

  const { data: attendances, isLoading: isLoadingAttendances } = useAttendanceBySchedule(scheduleId);
  const markAttendance = useMarkAttendance();
  const updateAttendance = useUpdateAttendance();

  // Загружаем активных участников группы
  useEffect(() => {
    if (!open) return;

    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        const activeMembers = await groupsApi.getGroupMembers(groupId, 'ACTIVE');

        // Создаём map посещаемости по clientId
        const attendanceMap = new Map<string, Attendance>();
        if (attendances) {
          attendances.forEach((att) => {
            attendanceMap.set(att.clientId, att);
          });
        }

        // Преобразуем участников группы в MemberWithAttendance
        const membersData: MemberWithAttendance[] = activeMembers.map((member) => ({
          id: member.clientId,
          memberId: member.id,
          firstName: member.client.firstName,
          lastName: member.client.lastName,
          middleName: member.client.middleName,
          phone: member.client.phone,
          joinedAt: member.joinedAt,
          promotedFromWaitlistAt: member.promotedFromWaitlistAt,
          attendance: attendanceMap.get(member.clientId),
        }));

        const guestAttendances =
          attendances?.filter(
            (att) => !activeMembers.some((member) => member.clientId === att.clientId)
          ) || [];

        const guestMembers: MemberWithAttendance[] = guestAttendances.map((att) => ({
          id: att.clientId,
          firstName: att.client.firstName,
          lastName: att.client.lastName,
          middleName: att.client.middleName,
          phone: att.client.phone,
          attendance: att,
          isGuest: true,
        }));

        setMembers([...membersData, ...guestMembers]);
      } catch (error) {
        console.error('Failed to load group members:', error);
        toast.error('Не удалось загрузить участников группы');
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [groupId, open, attendances]);

  // Загружаем список клиентов при открытии журнала
  useEffect(() => {
    const loadClients = async () => {
      if (!open) return;

      try {
        setIsLoadingClients(true);
        const clientsResponse = await getClients({ limit: 10000, page: 1 });
        setClients(clientsResponse?.data || []);
      } catch (error) {
        console.error('Failed to load clients:', error);
        toast.error('Не удалось загрузить клиентов');
      } finally {
        setIsLoadingClients(false);
      }
    };

    loadClients();
  }, [open]);

  const handleMarkAttendance = async (clientId: string, status: AttendanceStatus) => {
    const member = members.find((m) => m.id === clientId);

    if (!member) return;

    if (member.attendance) {
      // Обновляем существующую отметку
      try {
        setPendingClientId(clientId);
        await updateAttendance.mutateAsync({
          id: member.attendance.id,
          data: { status },
        });
      } finally {
        setPendingClientId(null);
      }
    } else {
      // Создаём новую отметку
      try {
        setPendingClientId(clientId);
        await markAttendance.mutateAsync({
          scheduleId,
          clientId,
          status,
        });
      } finally {
        setPendingClientId(null);
      }
    }
  };

  const handleSelectClientForAdd = async (clientId?: string | null) => {
    if (!clientId) {
      setSelectedClientId('');
      return;
    }

    if (members.some((member) => member.id === clientId)) {
      toast.error('Этот клиент уже есть в списке занятия');
      setSelectedClientId('');
      return;
    }

    try {
      setPendingClientId(clientId);
      setSelectedClientId(clientId);
      await markAttendance.mutateAsync({
        scheduleId,
        clientId,
        status: selectedStatus,
      });
    } catch (_error) {
      // toast показывается внутри hook'а useMarkAttendance
    } finally {
      setPendingClientId(null);
      setSelectedClientId('');
    }
  };

  const handleRemoveAttendance = async (member: MemberWithAttendance) => {
    if (!member.attendance) return;

    try {
      setPendingClientId(member.id);
      await deleteAttendance.mutateAsync(member.attendance.id);

      // Удаляем гостя полностью или очищаем отметку у участника
      setMembers((prev) => {
        if (member.isGuest) {
          return prev.filter((m) => m.id !== member.id);
        }
        return prev.map((m) =>
          m.id === member.id
            ? {
                ...m,
                attendance: undefined,
              }
            : m,
        );
      });
    } catch (_error) {
      // Ошибка уже показана в hook'е useDeleteAttendance
    } finally {
      setPendingClientId(null);
    }
  };

  const getAttendanceStats = () => {
    const present = members.filter((m) => m.attendance?.status === 'PRESENT').length;
    const absent = members.filter((m) => m.attendance?.status === 'ABSENT').length;
    const excused = members.filter((m) => m.attendance?.status === 'EXCUSED').length;
    const notMarked = members.filter((m) => !m.attendance).length;

    return { present, absent, excused, notMarked, total: members.length };
  };

  const stats = getAttendanceStats();
  const sortedMembers = useMemo(() => {
    const statusOrder: Record<string, number> = {
      PRESENT: 1,
      ABSENT: 2,
      EXCUSED: 3,
    };

    return [...members].sort((a, b) => {
      if (sortKey === 'status') {
        const aStatus = a.attendance?.status || 'ZZZ';
        const bStatus = b.attendance?.status || 'ZZZ';
        const statusDiff =
          (statusOrder[aStatus] ?? 99) - (statusOrder[bStatus] ?? 99);
        if (statusDiff !== 0) return statusDiff;
      }

      const aName = `${a.lastName} ${a.firstName}`.toLocaleLowerCase();
      const bName = `${b.lastName} ${b.firstName}`.toLocaleLowerCase();
      return aName.localeCompare(bName, 'ru');
    });
  }, [members, sortKey]);
  const isLoading = isLoadingAttendances || loadingMembers;

  const displayDateTime = useMemo(() => {
    const datePart = scheduleDate?.split('T')[0] || scheduleDate;
    const timePart = startTime.includes('T')
      ? startTime.split('T')[1].slice(0, 5)
      : startTime.slice(0, 5);
    const combined = new Date(`${datePart}T${timePart}`);
    return combined;
  }, [scheduleDate, startTime]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[600px] sm:max-w-[600px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          comboboxTriggerRef.current?.focus();
        }}
      >
        <SheetHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle>Журнал посещаемости</SheetTitle>
                <SheetDescription>
                  {groupName} • {displayDateTime.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </SheetDescription>
              </div>
              <div className="w-[180px]">
                <Select value={sortKey} onValueChange={(value) => setSortKey(value as 'name' | 'status')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">По ФИО</SelectItem>
                    <SelectItem value="status">По статусу</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </SheetHeader>

    <div className="mt-4 flex items-center justify-between gap-2">
      <div className="flex-1">
        <Combobox
          options={clientOptions}
          value={selectedClientId}
          onValueChange={(value) => handleSelectClientForAdd(value || null)}
          placeholder="Добавить клиента на занятие"
          searchPlaceholder="Поиск клиента..."
          emptyText="Клиент не найден"
          disabled={markAttendance.isPending || isLoadingClients || clients.length === 0}
          allowEmpty={false}
          triggerRef={comboboxTriggerRef}
        />
        {isLoadingClients && (
          <p className="text-xs text-muted-foreground mt-1">Загрузка списка клиентов...</p>
        )}
        {!isLoadingClients && clients.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">Нет доступных клиентов</p>
        )}
      </div>
      <div className="w-[170px]">
        <Select
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as AttendanceStatus)}
          disabled={markAttendance.isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PRESENT">Присутствует</SelectItem>
            <SelectItem value="ABSENT">Отсутствует</SelectItem>
            <SelectItem value="EXCUSED">Уважительная причина</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

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

          {/* Список участников */}
          <div className="overflow-y-auto h-[calc(100vh-300px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Для этого занятия пока нет участников. Добавьте клиента через поле выше.
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {sortedMembers.map((member, index) => (
                  <AttendanceRow
                    key={member.id}
                    index={index + 1}
                    member={member}
                    onMark={handleMarkAttendance}
                    onRemove={handleRemoveAttendance}
                    isLoading={pendingClientId === member.id}
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
  index: number;
  member: MemberWithAttendance;
  onMark: (clientId: string, status: AttendanceStatus) => void;
  onRemove: (member: MemberWithAttendance) => void;
  isLoading: boolean;
}

function AttendanceRow({ member, index, onMark, onRemove, isLoading }: AttendanceRowProps) {
  const { attendance } = member;

  const statusOptions: {
    value: AttendanceStatus;
    label: string;
    icon: JSX.Element;
    activeClass: string;
  }[] = [
    {
      value: 'PRESENT',
      label: 'Присутствует',
      icon: <Check className="h-3 w-3" />,
      activeClass: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
    },
    {
      value: 'ABSENT',
      label: 'Отсутствует',
      icon: <X className="h-3 w-3" />,
      activeClass: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    },
    {
      value: 'EXCUSED',
      label: 'Уважительная',
      icon: <AlertCircle className="h-3 w-3" />,
      activeClass: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600',
    },
  ];

  const statusColor =
    attendance?.status === 'PRESENT'
      ? 'bg-green-500'
      : attendance?.status === 'ABSENT'
        ? 'bg-red-500'
        : attendance?.status === 'EXCUSED'
          ? 'bg-yellow-500'
          : 'bg-muted-foreground';

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 text-sm">
      <span className="text-xs text-muted-foreground w-6 text-right">{index}.</span>
      <span className={cn('h-2.5 w-2.5 rounded-full', statusColor)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            {member.lastName} {member.firstName} {member.middleName || ''}
          </span>
          {member.promotedFromWaitlistAt && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Из листа ожидания
            </Badge>
          )}
          {member.isGuest && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
              Разовое
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{member.phone}</div>
      </div>

      <div className="flex items-center gap-1">
        {statusOptions.map((option) => {
          const isActive = attendance?.status === option.value;
          return (
            <Button
              key={option.value}
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              className={cn(
                'h-7 px-1.5 text-[11px]',
                isActive && option.activeClass
              )}
              onClick={() => onMark(member.id, option.value)}
              disabled={isLoading}
              title={option.label}
            >
              {option.icon}
            </Button>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => onRemove(member)}
          disabled={isLoading || !attendance}
          title="Убрать клиента из занятия"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
