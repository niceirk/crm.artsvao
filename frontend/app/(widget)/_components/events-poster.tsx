import { Event } from '../_lib/api';
import { DayHeader } from './day-header';
import { EventCard } from './event-card';

interface EventsPosterProps {
  events: Event[];
  groupByDate?: boolean;
}

/**
 * Группировать события по дате
 */
function groupEventsByDay(events: Event[]): Map<string, Event[]> {
  const groups = new Map<string, Event[]>();

  events.forEach(event => {
    const dateKey = event.date;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(event);
  });

  return groups;
}

export function EventsPoster({ events, groupByDate = true }: EventsPosterProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Нет мероприятий по выбранным критериям
      </div>
    );
  }

  // Если не группировать — показываем сеткой
  if (!groupByDate) {
    return (
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  }

  const groupedEvents = groupEventsByDay(events);

  return (
    <div className="space-y-8">
      {Array.from(groupedEvents).map(([date, dayEvents]) => (
        <section key={date}>
          <DayHeader date={date} />
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {dayEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
