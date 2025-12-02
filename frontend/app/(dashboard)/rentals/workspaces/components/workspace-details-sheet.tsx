'use client';

import { Pencil, Building2, Calendar, DollarSign, Info, Wifi } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Workspace } from '@/lib/api/workspaces';

interface WorkspaceDetailsSheetProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (workspace: Workspace) => void;
}

const statusConfig = {
  AVAILABLE: { label: 'Свободно', className: 'bg-green-100 text-green-800' },
  OCCUPIED: { label: 'Занято', className: 'bg-blue-100 text-blue-800' },
  MAINTENANCE: { label: 'На обслуживании', className: 'bg-orange-100 text-orange-800' },
};

export function WorkspaceDetailsSheet({
  workspace,
  open,
  onOpenChange,
  onEdit,
}: WorkspaceDetailsSheetProps) {
  if (!workspace) return null;

  const status = statusConfig[workspace.status];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{workspace.name}</SheetTitle>
              {workspace.number && (
                <SheetDescription>№ {workspace.number}</SheetDescription>
              )}
            </div>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Помещение */}
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Помещение</div>
              <div className="mt-1">
                {workspace.room ? (
                  <>
                    <div className="font-medium">{workspace.room.name}</div>
                    {workspace.room.number && (
                      <div className="text-sm text-muted-foreground">{workspace.room.number}</div>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Не указано</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Тарифы */}
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground">Тарифы</div>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">За день</div>
                  <div className="text-lg font-semibold">{formatPrice(workspace.dailyRate)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">За месяц</div>
                  <div className="text-lg font-semibold">{formatPrice(workspace.monthlyRate)}</div>
                </div>
                {workspace.weeklyRate && (
                  <div className="rounded-lg border p-3 col-span-2">
                    <div className="text-sm text-muted-foreground">За неделю</div>
                    <div className="text-lg font-semibold">{formatPrice(workspace.weeklyRate)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Описание */}
          {workspace.description && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Описание</div>
                  <div className="mt-1 text-sm">{workspace.description}</div>
                </div>
              </div>
            </>
          )}

          {/* Удобства */}
          {workspace.amenities && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Wifi className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Удобства</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {workspace.amenities.split(',').map((amenity, i) => (
                      <Badge key={i} variant="secondary">
                        {amenity.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Даты */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <div className="text-muted-foreground">
                Создано: {formatDate(workspace.createdAt)}
              </div>
              <div className="text-muted-foreground">
                Обновлено: {formatDate(workspace.updatedAt)}
              </div>
            </div>
          </div>

          {/* Статистика аренды */}
          {workspace._count && workspace._count.rentalApplications > 0 && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-sm font-medium">Статистика</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Заявок на аренду: {workspace._count.rentalApplications}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Действия */}
        <div className="mt-6 flex gap-2">
          <Button onClick={() => onEdit(workspace)} className="flex-1">
            <Pencil className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
