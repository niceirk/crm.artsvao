'use client';

import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CalendarPlus, Briefcase, Building2, ExternalLink, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CoworkingWorkspaceStatus } from '@/hooks/use-coworking-workspaces';
import type { Room } from '@/lib/api/rooms';

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждена',
  ACTIVE: 'Активна',
};

interface WorkspaceBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: CoworkingWorkspaceStatus | null;
  room: Room | null;
  date: string;
}

export function WorkspaceBookingSheet({
  open,
  onOpenChange,
  workspace,
  room,
  date,
}: WorkspaceBookingSheetProps) {
  const router = useRouter();

  if (!workspace || !room) return null;

  const isAvailable =
    workspace.baseStatus !== 'MAINTENANCE' && !workspace.isOccupiedOnDate;

  const statusLabel =
    workspace.baseStatus === 'MAINTENANCE'
      ? 'На обслуживании'
      : workspace.isOccupiedOnDate
        ? 'Занято'
        : 'Свободно';

  const handleBookWorkspace = () => {
    // Переход на страницу создания заявки с предзаполненными параметрами
    const params = new URLSearchParams({
      category: 'workspace',
      periodUnit: 'day',
      roomId: room.id,
      workspaceId: workspace.workspaceId,
      date: date,
    });
    router.push(`/rentals/new?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                {workspace.workspaceName}
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {room.name}
                {room.number && ` (${room.number})`}
              </SheetDescription>
            </div>

            <Badge
              className={cn(
                'shrink-0',
                isAvailable
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : workspace.baseStatus === 'MAINTENANCE'
                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                    : 'bg-red-100 text-red-700 border-red-200'
              )}
            >
              {statusLabel}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Выбранная дата */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Выбранная дата
            </h4>
            <div className="p-3 bg-muted rounded-lg font-medium">
              {format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: ru })}
            </div>
          </div>

          <Separator />

          {/* Тарифы */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Тарифы
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">За день</div>
                <div className="text-lg font-semibold">
                  {workspace.dailyRate.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              {workspace.weeklyRate && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">За неделю</div>
                  <div className="text-lg font-semibold">
                    {workspace.weeklyRate.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              )}
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">За месяц</div>
                <div className="text-lg font-semibold">
                  {workspace.monthlyRate.toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Статус и информация о заявке */}
          {!isAvailable && (
            <div className="space-y-3">
              {workspace.baseStatus === 'MAINTENANCE' ? (
                <div className="p-4 rounded-lg text-sm bg-gray-50 text-gray-700">
                  Рабочее место временно недоступно для бронирования (на обслуживании)
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                    <div className="text-sm font-medium text-red-700 mb-2">
                      Рабочее место занято
                    </div>
                    {workspace.occupancyInfo && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-red-600">
                          <User className="h-3.5 w-3.5" />
                          <span>{workspace.occupancyInfo.clientName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-600">
                            Заявка {workspace.occupancyInfo.applicationNumber}
                          </span>
                          <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                            {APPLICATION_STATUS_LABELS[workspace.occupancyInfo.status] || workspace.occupancyInfo.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  {workspace.occupancyInfo && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        router.push(`/rentals/${workspace.occupancyInfo!.applicationId}`);
                        onOpenChange(false);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Открыть заявку
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Кнопка бронирования */}
          <Button
            onClick={handleBookWorkspace}
            className="w-full"
            size="lg"
            disabled={!isAvailable}
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            {isAvailable ? 'Забронировать' : 'Недоступно'}
          </Button>

          {isAvailable && (
            <p className="text-xs text-muted-foreground text-center">
              Вы будете перенаправлены на страницу оформления заявки на аренду
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
