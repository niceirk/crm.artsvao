'use client';

import { Users, Ticket, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTimepadParticipants } from '@/hooks/use-timepad-participants';
import { Event } from '@/lib/api/events';

interface EventParticipantsCellProps {
  event: Event;
}

export function EventParticipantsCell({ event }: EventParticipantsCellProps) {
  const {
    data: timepadData,
    isLoading,
  } = useTimepadParticipants(event.timepadLink, { limit: 1 });

  // Если есть Timepad - используем данные оттуда, иначе из базы
  const hasTimepad = !!event.timepadLink;
  const participants = hasTimepad
    ? (timepadData?.total ?? null)
    : (event.participants ?? 0);

  if (hasTimepad && isLoading) {
    return (
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center gap-1">
            {hasTimepad ? (
              <Ticket className="h-3 w-3 text-blue-500" />
            ) : (
              <Users className="h-3 w-3 text-muted-foreground" />
            )}
            <span>{participants ?? 0}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {hasTimepad
            ? 'Зарегистрировано в Timepad'
            : 'Количество участников'
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface EventAvailableCellProps {
  event: Event;
}

export function EventAvailableCell({ event }: EventAvailableCellProps) {
  const {
    data: timepadData,
    isLoading,
  } = useTimepadParticipants(event.timepadLink, { limit: 1 });

  if (!event.maxCapacity) {
    return <div className="text-center text-muted-foreground">—</div>;
  }

  const hasTimepad = !!event.timepadLink;
  const participants = hasTimepad
    ? (timepadData?.total ?? 0)
    : (event.participants ?? 0);

  if (hasTimepad && isLoading) {
    return (
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  const available = Math.max(0, event.maxCapacity - participants);

  return (
    <div className={`text-center ${
      available <= 0
        ? 'text-destructive font-medium'
        : available <= 5
          ? 'text-amber-600 font-medium'
          : ''
    }`}>
      {available}
    </div>
  );
}
