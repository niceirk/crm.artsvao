'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useClient } from '@/hooks/useClients';
import { ClientHeader } from './components/client-header';
import { ClientInfoCard } from './components/client-info-card';
import { ClientContactsCard } from './components/client-contacts-card';
import { ClientRelationsCard } from './components/client-relations-card';
import { ClientHistoryCard } from './components/client-history-card';
import { ClientEditDialog } from '../components/client-edit-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { setCustomTitle } = useBreadcrumbs();

  const { data: client, isLoading, error } = useClient(clientId);

  // Устанавливаем название клиента в хлебные крошки
  useEffect(() => {
    if (client) {
      const clientName = `${client.firstName} ${client.lastName}`;
      setCustomTitle(clientName);
    }
  }, [client, setCustomTitle]);

  // Очищаем кастомный заголовок при размонтировании компонента
  useEffect(() => {
    return () => {
      setCustomTitle(null);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold">Клиент не найден</h2>
            <p className="text-muted-foreground mt-2">
              Клиент с указанным ID не существует или был удален
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Шапка с именем и действиями */}
      <ClientHeader
        client={client}
        onEdit={() => setIsEditDialogOpen(true)}
      />

      {/* Сетка с карточками информации */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка */}
        <div className="space-y-6">
          <ClientInfoCard client={client} />
          <ClientContactsCard client={client} />
        </div>

        {/* Правая колонка */}
        <div className="space-y-6">
          <ClientRelationsCard client={client} />
        </div>
      </div>

      {/* История активности на всю ширину */}
      <ClientHistoryCard client={client} />

      {/* Диалог редактирования */}
      <ClientEditDialog
        client={client}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
