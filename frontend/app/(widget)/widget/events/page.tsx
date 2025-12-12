import { Suspense } from 'react';
import { fetchEvents, fetchEventTypes, fetchEventDates, EventsFilters } from '../../_lib/api';
import { EventsPoster } from '../../_components/events-poster';
import { EventsFilters as EventsFiltersComponent } from '../../_components/events-filters';

interface EventsPageProps {
  searchParams: {
    eventTypeId?: string;
    isForChildren?: string;
    hasAvailableSeats?: string;
    date?: string;
    limit?: string;
  };
}

async function EventsContent({ filters }: { filters: EventsFilters }) {
  const events = await fetchEvents(filters);
  const hasDateFilter = !!filters.date;

  return <EventsPoster events={events} groupByDate={!hasDateFilter} />;
}

async function FiltersLoader() {
  const [eventTypes, datesWithEvents] = await Promise.all([
    fetchEventTypes(),
    fetchEventDates(),
  ]);
  return <EventsFiltersComponent eventTypes={eventTypes} datesWithEvents={datesWithEvents} />;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-4 mb-6 animate-pulse">
      <div className="h-14 bg-muted rounded-lg" />
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-muted rounded-lg" />
        <div className="h-10 w-10 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

export default function EventsPage({ searchParams }: EventsPageProps) {
  const filters: EventsFilters = {
    eventTypeId: searchParams.eventTypeId,
    isForChildren: searchParams.isForChildren === 'true' ? true : undefined,
    hasAvailableSeats: searchParams.hasAvailableSeats === 'true' ? true : undefined,
    date: searchParams.date,
    limit: searchParams.limit ? parseInt(searchParams.limit, 10) : 30,
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Афиша мероприятий</h1>

      <Suspense fallback={<FiltersSkeleton />}>
        <FiltersLoader />
      </Suspense>

      <Suspense fallback={<LoadingState />}>
        <EventsContent filters={filters} />
      </Suspense>
    </div>
  );
}
