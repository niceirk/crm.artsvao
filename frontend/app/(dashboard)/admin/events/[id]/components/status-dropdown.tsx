'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useUpdateEvent } from '@/hooks/use-events';
import { toast } from 'sonner';
import { CalendarEventStatus } from '@/lib/api/events';

interface StatusDropdownProps {
  eventId: string;
  currentStatus: CalendarEventStatus;
  version?: number;
}

const STATUS_CONFIG = {
  PLANNED: {
    label: 'Запланировано',
    variant: 'default' as const,
  },
  ONGOING: {
    label: 'В процессе',
    variant: 'secondary' as const,
  },
  COMPLETED: {
    label: 'Завершено',
    variant: 'outline' as const,
  },
  CANCELLED: {
    label: 'Отменено',
    variant: 'destructive' as const,
  },
};

export function StatusDropdown({ eventId, currentStatus, version }: StatusDropdownProps) {
  const [isChanging, setIsChanging] = useState(false);
  const updateEvent = useUpdateEvent();

  const handleStatusChange = async (newStatus: CalendarEventStatus) => {
    if (newStatus === currentStatus) return;

    setIsChanging(true);
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        data: { status: newStatus, version },
      });
      toast.success(`Статус изменен на "${STATUS_CONFIG[newStatus].label}"`);
    } catch (error) {
      toast.error('Не удалось изменить статус');
      console.error('Failed to update status:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const currentConfig = STATUS_CONFIG[currentStatus];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isChanging}>
          {isChanging ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Badge variant={currentConfig.variant} className="mr-2">
              {currentConfig.label}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleStatusChange('PLANNED')}
          disabled={currentStatus === 'PLANNED'}
        >
          {STATUS_CONFIG.PLANNED.label}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('ONGOING')}
          disabled={currentStatus === 'ONGOING'}
        >
          {STATUS_CONFIG.ONGOING.label}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('COMPLETED')}
          disabled={currentStatus === 'COMPLETED'}
        >
          {STATUS_CONFIG.COMPLETED.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleStatusChange('CANCELLED')}
          disabled={currentStatus === 'CANCELLED'}
          className="text-destructive focus:text-destructive"
        >
          {STATUS_CONFIG.CANCELLED.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
