'use client';

import { useMemo, useState, useEffect, useRef, type JSX } from 'react';
import { format } from 'date-fns';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ClientSearch } from '@/components/clients/client-search';
import {
  useAttendanceBySchedule,
  useAttendanceBases,
  useMarkAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
} from '@/hooks/use-attendance';
import { groupsApi } from '@/lib/api/groups';
import { GroupMemberStatus } from '@/lib/types/groups';
import { Loader2, Check, X, AlertCircle, Trash2, CreditCard, Banknote } from 'lucide-react';
import { SellSubscriptionDialog } from '@/app/(dashboard)/subscriptions/components/sell-subscription-dialog';
import type {
  Attendance,
  AttendanceStatus,
  AttendanceBaseOption,
} from '@/lib/types/attendance';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/utils/toast';
import { subscriptionsApi } from '@/lib/api/subscriptions';

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
  const deleteAttendance = useDeleteAttendance();
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'status'>('name');
  const [groupData, setGroupData] = useState<{ singleSessionPrice: number } | null>(null);
  const [singleSessionLoading, setSingleSessionLoading] = useState(false);

  const { data: attendances, isLoading: isLoadingAttendances } = useAttendanceBySchedule(scheduleId);
  const attendanceBasesQuery = useAttendanceBases(scheduleId);
  const basesResponse = attendanceBasesQuery.data;
  const [selectedBases, setSelectedBases] = useState<Record<string, string>>({});
  const [quickSaleTarget, setQuickSaleTarget] = useState<string | null>(null);
  const markAttendance = useMarkAttendance();
  const updateAttendance = useUpdateAttendance();
  const basisOptionsMap = useMemo(() => {
    const map = new Map<string, AttendanceBaseOption[]>();
    basesResponse?.bases.forEach((base) => {
      const existing = map.get(base.clientId) ?? [];
      existing.push(base);
      map.set(base.clientId, existing);
    });
    return map;
  }, [basesResponse?.bases]);

  useEffect(() => {
    setSelectedBases({});
  }, [scheduleId]);

  useEffect(() => {
    if (!basesResponse) return;

    setSelectedBases((prev) => {
      const updated = { ...prev };
      let changed = false;
      const grouped: Record<string, AttendanceBaseOption[]> = {};

      basesResponse.bases.forEach((base) => {
        if (!grouped[base.clientId]) {
          grouped[base.clientId] = [];
        }
        grouped[base.clientId].push(base);
      });

      Object.entries(grouped).forEach(([clientId, options]) => {
        const existing = prev[clientId];
        const existsInOptions = options.some((option) => option.id === existing);

        if (!existing || !existsInOptions) {
          updated[clientId] = options[0].id;
          changed = true;
        }
      });

      return changed ? updated : prev;
    });
  }, [basesResponse]);

  // Загружаем данные группы (для singleSessionPrice) и обновляем данные абонементов при открытии
  useEffect(() => {
    if (!open) return;

    // Загружаем данные группы
    const loadGroupData = async () => {
      try {
        const group = await groupsApi.getGroup(groupId);
        setGroupData({ singleSessionPrice: Number(group.singleSessionPrice) });
      } catch (error) {
        console.error('Failed to load group data:', error);
      }
    };

    loadGroupData();
    // Принудительно обновляем данные абонементов при каждом открытии
    attendanceBasesQuery.refetch();
  }, [open, groupId]);

  // Загружаем активных участников группы
  useEffect(() => {
    if (!open) return;

    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        const activeMembers = await groupsApi.getGroupMembers(groupId, GroupMemberStatus.ACTIVE);

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

  const handleMarkAttendance = async (clientId: string, status: AttendanceStatus) => {
    const member = members.find((m) => m.id === clientId);

    if (!member) return;

    const basisId = selectedBases[clientId];

    if (member.attendance) {
      // Обновляем существующую отметку
      try {
        setPendingClientId(clientId);
        await updateAttendance.mutateAsync({
          id: member.attendance.id,
          data: {
            status,
            ...(status === 'PRESENT' && basisId ? { subscriptionId: basisId } : {}),
          },
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
          ...(status === 'PRESENT' && basisId ? { subscriptionId: basisId } : {}),
        });
      } finally {
        setPendingClientId(null);
      }
    }
  };

  const handleBasisChange = async (clientId: string, basisId: string) => {
    const previousBasisId = selectedBases[clientId];
    setSelectedBases((prev) => ({
      ...prev,
      [clientId]: basisId,
    }));

    const member = members.find((m) => m.id === clientId);
    if (!member?.attendance || member.attendance.status !== 'PRESENT') {
      return;
    }

    try {
      setPendingClientId(clientId);
      await updateAttendance.mutateAsync({
        id: member.attendance.id,
        data: {
          status: 'PRESENT',
          subscriptionId: basisId,
        },
      });
    } catch {
      setSelectedBases((prev) => ({
        ...prev,
        [clientId]: previousBasisId,
      }));
    } finally {
      setPendingClientId(null);
    }
  };

  const handleOpenQuickSale = (clientId: string) => {
    setQuickSaleTarget(clientId);
  };

  // Продажа разового занятия через API с созданием подписки и счёта
  const handleSellSingleSession = async (clientId: string) => {
    if (!groupData || singleSessionLoading) return;

    const member = members.find((m) => m.id === clientId);
    if (!member) return;

    try {
      setSingleSessionLoading(true);
      setPendingClientId(clientId);

      // Вызываем API продажи разового посещения (создаёт подписку + счёт)
      await subscriptionsApi.sellSingleSession({
        clientId,
        groupId,
        scheduleId,
        date: scheduleDate,
        notes: `Разовое посещение на ${new Date(scheduleDate).toLocaleDateString('ru-RU')}`,
      });

      // Отмечаем присутствие
      await markAttendance.mutateAsync({
        scheduleId,
        clientId,
        status: 'PRESENT',
      });

      toast.success(`Разовое посещение продано за ${groupData.singleSessionPrice} ₽`);
      attendanceBasesQuery.refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка продажи разового занятия');
    } finally {
      setSingleSessionLoading(false);
      setPendingClientId(null);
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
        <ClientSearch
          value={selectedClientId || undefined}
          onValueChange={(value) => handleSelectClientForAdd(value || null)}
          placeholder="Добавить клиента на занятие..."
          disabled={markAttendance.isPending}
          showCreateButton={false}
        />
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
                {sortedMembers.map((member, index) => {
                  const availableBases = basisOptionsMap.get(member.id) ?? [];
                  return (
                    <AttendanceRow
                      key={member.id}
                      index={index + 1}
                      member={member}
                      onMark={handleMarkAttendance}
                      onRemove={handleRemoveAttendance}
                      isLoading={pendingClientId === member.id}
                      availableBases={availableBases}
                      selectedBasisId={selectedBases[member.id]}
                      onBasisChange={handleBasisChange}
                      onQuickSale={() => handleOpenQuickSale(member.id)}
                      onSellSingleSession={() => handleSellSingleSession(member.id)}
                      singleSessionPrice={groupData?.singleSessionPrice}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      <SellSubscriptionDialog
        open={Boolean(quickSaleTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setQuickSaleTarget(null);
          }
        }}
        preselectedClientId={quickSaleTarget ?? undefined}
        preselectedGroupId={groupId}
        onSuccess={() => attendanceBasesQuery.refetch()}
        excludeSingleVisit={true}
      />

    </Sheet>
  );
}

interface AttendanceRowProps {
  index: number;
  member: MemberWithAttendance;
  onMark: (clientId: string, status: AttendanceStatus) => void;
  onRemove: (member: MemberWithAttendance) => void;
  isLoading: boolean;
  availableBases: AttendanceBaseOption[];
  selectedBasisId?: string;
  onBasisChange: (clientId: string, basisId: string) => void;
  onQuickSale: () => void;
  onSellSingleSession: () => void;
  singleSessionPrice?: number;
}

function AttendanceRow({
  member,
  index,
  onMark,
  onRemove,
  isLoading,
  availableBases,
  selectedBasisId,
  onBasisChange,
  onQuickSale,
  onSellSingleSession,
  singleSessionPrice,
}: AttendanceRowProps) {
  const [showSingleSessionConfirm, setShowSingleSessionConfirm] = useState(false);
  const { attendance } = member;
  const selectedBase = availableBases.find((base) => base.id === selectedBasisId);
  const hasBasis = availableBases.length > 0;

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

  return (
    <>
    <div className={cn(
      "flex items-start gap-2 px-2 py-1.5 text-sm",
      !hasBasis && "bg-yellow-50/50"
    )}>
      <span className="text-[10px] text-muted-foreground w-5 text-right pt-0.5">{index}.</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-xs">
            {member.lastName} {member.firstName} {member.middleName || ''}
          </span>
          {/* Основание или иконки продажи */}
          {hasBasis ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-[10px] text-muted-foreground underline decoration-dotted hover:text-primary cursor-pointer ml-1"
                  disabled={isLoading}
                >
                  {selectedBase?.subscriptionType.type === 'VISIT_PACK'
                    ? `Разовое (${selectedBase?.remainingVisits ?? 0})`
                    : 'Абонемент'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  {availableBases.map((base) => {
                    const saleDate = base.startDate
                      ? format(new Date(base.startDate), 'dd.MM.yyyy')
                      : 'дата не указана';
                    const isSelected = selectedBasisId === base.id;
                    const typeLabel = base.subscriptionType.type === 'VISIT_PACK'
                      ? `Разовые посещения`
                      : base.subscriptionType.type === 'UNLIMITED'
                        ? 'Безлимитный'
                        : 'Абонемент';
                    return (
                      <button
                        key={base.id}
                        onClick={() => onBasisChange(member.id, base.id)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted',
                          isSelected && 'bg-muted font-medium'
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <span>{base.subscriptionType.name}</span>
                          {base.remainingVisits !== null && base.remainingVisits !== undefined && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                              {base.remainingVisits} визитов
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex justify-between">
                          <span>{typeLabel}</span>
                          <span>от {saleDate}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex gap-0.5 ml-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={onQuickSale}
                disabled={isLoading}
                className="h-5 w-5 p-0"
                title="Продать абонемент"
              >
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSingleSessionConfirm(true)}
                disabled={isLoading || !singleSessionPrice}
                className="h-5 w-5 p-0"
                title={singleSessionPrice ? `Разовое посещение: ${singleSessionPrice} ₽` : 'Цена не указана'}
              >
                <Banknote className="h-3.5 w-3.5 text-muted-foreground hover:text-green-600" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 self-start">
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

    {/* Диалог подтверждения продажи разового посещения */}
    <AlertDialog open={showSingleSessionConfirm} onOpenChange={setShowSingleSessionConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Продать разовое посещение?</AlertDialogTitle>
          <AlertDialogDescription>
            Будет сформирован счёт на сумму {singleSessionPrice} ₽ для клиента{' '}
            <strong>{member.lastName} {member.firstName}</strong> и клиент будет отмечен как присутствующий на занятии.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onSellSingleSession();
              setShowSingleSessionConfirm(false);
            }}
          >
            Продать за {singleSessionPrice} ₽
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
