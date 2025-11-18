'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Event page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Произошла ошибка</AlertTitle>
          <AlertDescription>
            {error.message || 'Не удалось загрузить информацию о мероприятии'}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={reset}>Попробовать снова</Button>
          <Button variant="outline" asChild>
            <Link href="/admin/events">Вернуться к списку</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
