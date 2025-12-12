import { Suspense } from 'react';
import { fetchStudios } from '../../_lib/api';
import { StudioCard } from '../../_components/studio-card';

interface StudiosPageProps {
  searchParams: { studioId?: string };
}

async function StudiosContent({ studioId }: { studioId?: string }) {
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

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function StudiosPage({ searchParams }: StudiosPageProps) {
  return (
    <div className="container max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Расписание студий</h1>
      <Suspense fallback={<LoadingState />}>
        <StudiosContent studioId={searchParams.studioId} />
      </Suspense>
    </div>
  );
}
