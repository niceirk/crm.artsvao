'use client';

import { useMemo, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientSearch } from '@/components/clients/client-search';
import {
  useEventParticipants,
  useRegisterEventParticipant,
  useConfirmEventAttendance,
  useMarkEventNoShow,
  useCancelEventRegistration,
} from '@/hooks/use-event-participants';
import { useTimepadParticipants } from '@/hooks/use-timepad-participants';
import type { EventParticipant, EventParticipantStatus } from '@/lib/api/event-participants';
import {
  Loader2,
  Check,
  X,
  AlertCircle,
  Trash2,
  Users,
  Ticket,
  RefreshCw,
  Mail,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/utils/toast';

interface EventAttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  eventDate: string;
  startTime?: string;
  timepadLink?: string | null;
}

const STATUS_LABELS: Record<EventParticipantStatus, string> = {
  REGISTERED: 'Зарегистрирован',
  CONFIRMED: 'Подтверждён',
  NO_SHOW: 'Неявка',
  CANCELLED: 'Отменён',
};

const STATUS_COLORS: Record<EventParticipantStatus, string> = {
  REGISTERED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  NO_SHOW: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export function EventAttendanceSheet({
  open,
  onOpenChange,
  eventId,
  eventName,
  eventDate,
  startTime,
  timepadLink,
}: EventAttendanceSheetProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'status'>('name');
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);

  // Загружаем участников CRM
  const {
    data: participantsData,
    isLoading: isLoadingParticipants,
    refetch: refetchParticipants,
  } = useEventParticipants(eventId, { limit: 100 });

  // Загружаем участников Timepad
  const {
    data: timepadData,
    isLoading: isLoadingTimepad,
    refetch: refetchTimepad,
    isFetching: isFetchingTimepad,
  } = useTimepadParticipants(timepadLink, { limit: 100 });

  const registerParticipant = useRegisterEventParticipant();
  const confirmAttendance = useConfirmEventAttendance();
  const markNoShow = useMarkEventNoShow();
  const cancelRegistration = useCancelEventRegistration();

  const crmParticipants = participantsData?.data || [];
  const timepadParticipants = timepadData?.participants || [];
  const hasTimepadLink = !!timepadLink;

  // Статистика
  const stats = useMemo(() => {
    const crmTotal = crmParticipants.length;
    const crmConfirmed = crmParticipants.filter((p) => p.status === 'CONFIRMED').length;
    const crmNoShow = crmParticipants.filter((p) => p.status === 'NO_SHOW').length;
    const timepadTotal = timepadData?.total || 0;

    return {
      crmTotal,
      crmConfirmed,
      crmNoShow,
      timepadTotal,
    };
  }, [crmParticipants, timepadData]);

  // Сортировка участников CRM
  const sortedParticipants = useMemo(() => {
    const statusOrder: Record<string, number> = {
      CONFIRMED: 1,
      REGISTERED: 2,
      NO_SHOW: 3,
      CANCELLED: 4,
    };

    return [...crmParticipants].sort((a, b) => {
      if (sortKey === 'status') {
        const statusDiff =
          (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
      }

      const aName = `${a.client.lastName} ${a.client.firstName}`.toLocaleLowerCase();
      const bName = `${b.client.lastName} ${b.client.firstName}`.toLocaleLowerCase();
      return aName.localeCompare(bName, 'ru');
    });
  }, [crmParticipants, sortKey]);

  // Добавить клиента
  const handleAddClient = async (clientId?: string | null) => {
    if (!clientId) {
      setSelectedClientId('');
      return;
    }

    if (crmParticipants.some((p) => p.clientId === clientId)) {
      toast.error('Этот клиент уже записан на мероприятие');
      setSelectedClientId('');
      return;
    }

    try {
      setPendingClientId(clientId);
      setSelectedClientId(clientId);
      await registerParticipant.mutateAsync({
        eventId,
        data: { clientId, source: 'CRM' },
      });
    } finally {
      setPendingClientId(null);
      setSelectedClientId('');
    }
  };

  // Подтвердить присутствие
  const handleConfirm = async (participant: EventParticipant) => {
    if (participant.status === 'CONFIRMED') return;

    try {
      setPendingClientId(participant.clientId);
      await confirmAttendance.mutateAsync({
        eventId,
        clientId: participant.clientId,
      });
    } finally {
      setPendingClientId(null);
    }
  };

  // Отметить неявку
  const handleNoShow = async (participant: EventParticipant) => {
    if (participant.status === 'NO_SHOW') return;

    try {
      setPendingClientId(participant.clientId);
      await markNoShow.mutateAsync({
        eventId,
        clientId: participant.clientId,
      });
    } finally {
      setPendingClientId(null);
    }
  };

  // Отменить регистрацию
  const handleCancel = async (participant: EventParticipant) => {
    try {
      setPendingClientId(participant.clientId);
      await cancelRegistration.mutateAsync({
        eventId,
        clientId: participant.clientId,
      });
    } finally {
      setPendingClientId(null);
    }
  };

  // Форматирование даты и времени
  const displayDateTime = useMemo(() => {
    const datePart = eventDate?.split('T')[0] || eventDate;
    const timePart = startTime
      ? startTime.includes('T')
        ? startTime.split('T')[1].slice(0, 5)
        : startTime.slice(0, 5)
      : '';
    const combined = timePart
      ? new Date(`${datePart}T${timePart}`)
      : new Date(datePart);
    return combined;
  }, [eventDate, startTime]);

  const isLoading = isLoadingParticipants;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[650px] sm:max-w-[650px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle>Журнал посещаемости</SheetTitle>
                <SheetDescription>
                  {eventName} •{' '}
                  {displayDateTime.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    ...(startTime && { hour: '2-digit', minute: '2-digit' }),
                  })}
                </SheetDescription>
              </div>
              <div className="w-[180px]">
                <Select
                  value={sortKey}
                  onValueChange={(value) => setSortKey(value as 'name' | 'status')}
                >
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

        {/* Добавить клиента */}
        <div className="mt-4">
          <ClientSearch
            value={selectedClientId || undefined}
            onValueChange={(value) => handleAddClient(value || null)}
            placeholder="Добавить клиента на мероприятие..."
            disabled={registerParticipant.isPending}
            showCreateButton={false}
          />
        </div>

        <div className="mt-6 space-y-4">
          {/* Статистика */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.crmTotal}</div>
              <div className="text-xs text-muted-foreground">CRM</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.timepadTotal}</div>
              <div className="text-xs text-muted-foreground">Timepad</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.crmConfirmed}</div>
              <div className="text-xs text-muted-foreground">Подтверждено</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.crmNoShow}</div>
              <div className="text-xs text-muted-foreground">Неявка</div>
            </div>
          </div>

          <Separator />

          {/* Участники CRM */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                Участники CRM ({crmParticipants.length})
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : crmParticipants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center border rounded-md">
                <Users className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Нет зарегистрированных участников в CRM
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Добавьте клиента через поле поиска выше
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-md border max-h-[200px] overflow-y-auto">
                {sortedParticipants.map((participant, index) => (
                  <ParticipantRow
                    key={participant.id}
                    index={index + 1}
                    participant={participant}
                    onConfirm={handleConfirm}
                    onNoShow={handleNoShow}
                    onCancel={handleCancel}
                    isLoading={pendingClientId === participant.clientId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Регистрации Timepad */}
          {hasTimepadLink && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      Регистрации Timepad ({timepadData?.total || 0})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refetchTimepad()}
                    disabled={isFetchingTimepad}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isFetchingTimepad ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>

                {isLoadingTimepad ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timepadParticipants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center border rounded-md">
                    <Ticket className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Нет регистраций в Timepad
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[250px]">
                    <div className="divide-y rounded-md border">
                      {timepadParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 px-3 py-2 text-sm"
                        >
                          <div className="flex-shrink-0">
                            {participant.isPaid ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {participant.name}
                              </span>
                              {participant.tickets.length > 1 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1 py-0"
                                >
                                  {participant.tickets.length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{participant.email}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {participant.tickets[0]?.ticketType}
                            {participant.paymentAmount &&
                              participant.paymentAmount !== '0' && (
                                <span className="ml-1">
                                  ({participant.paymentAmount} ₽)
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ParticipantRowProps {
  index: number;
  participant: EventParticipant;
  onConfirm: (participant: EventParticipant) => void;
  onNoShow: (participant: EventParticipant) => void;
  onCancel: (participant: EventParticipant) => void;
  isLoading: boolean;
}

function ParticipantRow({
  index,
  participant,
  onConfirm,
  onNoShow,
  onCancel,
  isLoading,
}: ParticipantRowProps) {
  const { client, status } = participant;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
      <span className="text-[10px] text-muted-foreground w-5 text-right">
        {index}.
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-xs">
            {client.lastName} {client.firstName} {client.middleName || ''}
          </span>
          <Badge className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[status])}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>
        {client.phone && (
          <div className="text-[10px] text-muted-foreground">{client.phone}</div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Подтвердить присутствие */}
        <Button
          size="sm"
          variant={status === 'CONFIRMED' ? 'default' : 'outline'}
          className={cn(
            'h-7 px-1.5',
            status === 'CONFIRMED' &&
              'bg-green-600 hover:bg-green-700 text-white border-green-600'
          )}
          onClick={() => onConfirm(participant)}
          disabled={isLoading || status === 'CANCELLED'}
          title="Подтвердить присутствие"
        >
          <Check className="h-3 w-3" />
        </Button>

        {/* Отметить неявку */}
        <Button
          size="sm"
          variant={status === 'NO_SHOW' ? 'default' : 'outline'}
          className={cn(
            'h-7 px-1.5',
            status === 'NO_SHOW' &&
              'bg-red-600 hover:bg-red-700 text-white border-red-600'
          )}
          onClick={() => onNoShow(participant)}
          disabled={isLoading || status === 'CANCELLED'}
          title="Отметить неявку"
        >
          <X className="h-3 w-3" />
        </Button>

        {/* Удалить */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => onCancel(participant)}
          disabled={isLoading}
          title="Отменить регистрацию"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
