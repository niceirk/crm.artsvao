import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchStudios, fetchEvents, fetchEventTypes, fetchEventDates, EventsFilters } from '../_lib/api';
import { StudioCard } from '../_components/studio-card';
import { EventsPoster } from '../_components/events-poster';
import { EventsFilters as EventsFiltersComponent } from '../_components/events-filters';

interface WidgetPageProps {
  searchParams: {
    tab?: string;
    studioId?: string;
    eventTypeId?: string;
    isForChildren?: string;
    date?: string;
    limit?: string;
  };
}

async function StudiosSection({ studioId }: { studioId?: string }) {
  const studios = await fetchStudios(studioId);

  if (studios.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Нет доступных студий
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {studios.map(studio => (
        <StudioCard key={studio.id} studio={studio} />
      ))}
    </div>
  );
}

async function EventsSection({ filters }: { filters: EventsFilters }) {
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

export default function WidgetPage({ searchParams }: WidgetPageProps) {
  const defaultTab = searchParams.tab || 'events';

  const filters: EventsFilters = {
    eventTypeId: searchParams.eventTypeId,
    isForChildren: searchParams.isForChildren === 'true' ? true : undefined,
    date: searchParams.date,
    limit: searchParams.limit ? parseInt(searchParams.limit, 10) : 30,
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="studios">Студии</TabsTrigger>
          <TabsTrigger value="events">Афиша</TabsTrigger>
        </TabsList>

        <TabsContent value="studios">
          <Suspense fallback={<LoadingState />}>
            <StudiosSection studioId={searchParams.studioId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="events">
          <Suspense fallback={<FiltersSkeleton />}>
            <FiltersLoader />
          </Suspense>
          <Suspense fallback={<LoadingState />}>
            <EventsSection filters={filters} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
