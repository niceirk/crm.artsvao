import { notFound } from 'next/navigation';
import { fetchEvent } from '../../../_lib/api';
import { EventDetail } from '../../../_components/event-detail';

interface EventPageProps {
  params: { id: string };
}

export default async function EventPage({ params }: EventPageProps) {
  try {
    const event = await fetchEvent(params.id);

    return (
      <div className="container max-w-5xl mx-auto py-6 px-4">
        <EventDetail event={event} />
      </div>
    );
  } catch {
    notFound();
  }
}
