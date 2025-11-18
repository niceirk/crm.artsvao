import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-3xl font-bold">Мероприятие не найдено</h1>
        <p className="text-muted-foreground max-w-md">
          К сожалению, запрашиваемое мероприятие не существует или было удалено.
        </p>
        <Button asChild>
          <Link href="/admin/events">Вернуться к списку мероприятий</Link>
        </Button>
      </div>
    </div>
  );
}
