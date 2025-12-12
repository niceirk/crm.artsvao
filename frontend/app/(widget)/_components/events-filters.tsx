'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Baby, ChevronDown, X, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DateStrip } from './date-strip';
import { EventType } from '../_lib/api';

interface EventsFiltersProps {
  eventTypes: EventType[];
  datesWithEvents: string[];
}

export function EventsFilters({ eventTypes, datesWithEvents }: EventsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedEventTypeId = searchParams.get('eventTypeId');
  const isForChildren = searchParams.get('isForChildren') === 'true';
  const hasAvailableSeats = searchParams.get('hasAvailableSeats') === 'true';
  const selectedDate = searchParams.get('date');

  const selectedEventType = eventTypes.find((et) => et.id === selectedEventTypeId);

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleDateSelect = (date: string | null) => {
    updateFilters({ date });
  };

  const handleEventTypeSelect = (eventTypeId: string | null) => {
    updateFilters({ eventTypeId });
  };

  const handleChildrenToggle = () => {
    updateFilters({ isForChildren: isForChildren ? null : 'true' });
  };

  const handleAvailableSeatsToggle = () => {
    updateFilters({ hasAvailableSeats: hasAvailableSeats ? null : 'true' });
  };

  const handleClearFilters = () => {
    updateFilters({ eventTypeId: null, isForChildren: null, hasAvailableSeats: null, date: null });
  };

  const hasActiveFilters = selectedEventTypeId || isForChildren || hasAvailableSeats || selectedDate;

  return (
    <div className="space-y-4 mb-6">
      <DateStrip selectedDate={selectedDate} onSelectDate={handleDateSelect} datesWithEvents={datesWithEvents} />

      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'gap-2',
                selectedEventTypeId && 'bg-amber-300 hover:bg-amber-400 border-amber-300 text-black'
              )}
            >
              {selectedEventType?.name || 'Все события'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleEventTypeSelect(null)}>
              Все события
            </DropdownMenuItem>
            {eventTypes.map((eventType) => (
              <DropdownMenuItem
                key={eventType.id}
                onClick={() => handleEventTypeSelect(eventType.id)}
              >
                {eventType.color && (
                  <span
                    className="w-3 h-3 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: eventType.color }}
                  />
                )}
                {eventType.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={isForChildren ? 'default' : 'outline'}
          onClick={handleChildrenToggle}
          title="Для детей"
          className={cn(
            'transition-colors gap-2',
            isForChildren && 'bg-amber-300 hover:bg-amber-400 border-amber-300 text-black'
          )}
        >
          <Baby className="h-4 w-4" />
          <span>Для детей</span>
        </Button>

        <Button
          variant={hasAvailableSeats ? 'default' : 'outline'}
          onClick={handleAvailableSeatsToggle}
          title="Есть билеты"
          className={cn(
            'transition-colors gap-2',
            hasAvailableSeats && 'bg-amber-300 hover:bg-amber-400 border-amber-300 text-black'
          )}
        >
          <Ticket className="h-4 w-4" />
          <span>Есть билеты</span>
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearFilters}
            title="Сбросить фильтры"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
