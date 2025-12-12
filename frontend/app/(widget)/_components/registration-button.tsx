'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchTicketsAvailability, TicketAvailability } from '../_lib/api';
import { RegistrationModal } from './registration-modal';

interface RegistrationButtonProps {
  eventId: string;
  eventName: string;
  timepadLink: string;
  maxCapacity?: number | null;
}

export function RegistrationButton({
  eventId,
  eventName,
  timepadLink,
  maxCapacity,
}: RegistrationButtonProps) {
  const [tickets, setTickets] = useState<TicketAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
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
          // Timepad не вернул данные
          setTickets(null);
        }
      } catch {
        if (cancelled) return;
        setError(true);
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
  }, [eventId]);

  // Если нет данных от Timepad и нет maxCapacity - показываем кнопку
  // Если есть данные от Timepad - используем их
  const hasAvailableSeats = tickets ? tickets.available > 0 : !maxCapacity;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <Button size="lg" disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Проверяем билеты...
            </Button>
          ) : hasAvailableSeats ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => setModalOpen(true)}
            >
              Регистрация на мероприятие
            </Button>
          ) : (
            <div className="text-center py-3 text-muted-foreground font-medium">
              Билеты закончились
            </div>
          )}
        </div>
      </div>

      <RegistrationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eventId={eventId}
        eventName={eventName}
        timepadLink={timepadLink}
      />
    </>
  );
}
