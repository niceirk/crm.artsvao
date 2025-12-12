'use client';

import { useEffect, useState } from 'react';
import { Loader2, Ticket } from 'lucide-react';
import { fetchTicketsAvailability, TicketAvailability } from '../_lib/api';

function pluralizeTickets(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 19) {
    return `${count} билетов`;
  }

  if (lastOne === 1) {
    return `${count} билет`;
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return `${count} билета`;
  }

  return `${count} билетов`;
}

interface TicketsBadgeProps {
  eventId: string;
  maxCapacity?: number | null;
  participants?: number | null;
}

export function TicketsBadge({ eventId, maxCapacity, participants }: TicketsBadgeProps) {
  const [tickets, setTickets] = useState<TicketAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Если нет maxCapacity - не показываем билеты
    if (!maxCapacity) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadTickets = async () => {
      setLoading(true);
      setError(false);

      try {
        const result = await fetchTicketsAvailability([eventId]);
        if (cancelled) return;

        const ticketData = result[eventId];

        if (ticketData) {
          setTickets(ticketData);
        } else {
          // Timepad не вернул данные - не показываем информацию о билетах
          setTickets(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(true);
        // При ошибке не показываем ложные данные
        setTickets(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, [eventId, maxCapacity]);

  // Если нет maxCapacity - не показываем ничего
  if (!maxCapacity) return null;

  return (
    <>
      <span className="mx-1.5">·</span>
      {loading ? (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">проверяем...</span>
        </span>
      ) : tickets ? (
        <span className={`inline-flex items-center gap-1 font-medium ${tickets.available > 0 ? 'text-green-600' : 'text-red-500'}`}>
          <Ticket className="h-3 w-3" />
          {tickets.available > 0 ? (
            <span>{pluralizeTickets(tickets.available)}</span>
          ) : (
            <span>Билеты закончились</span>
          )}
        </span>
      ) : null}
    </>
  );
}
