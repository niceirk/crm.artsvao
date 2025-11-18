'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useClient } from '@/hooks/useClients';
import { ClientHeader } from './components/client-header';
import { ClientInfoCard } from './components/client-info-card';
import { ClientRelationsCard } from './components/client-relations-card';
import { ClientHistoryCard } from './components/client-history-card';
import { ClientNotesCard } from './components/client-notes-card';
import { ClientEditDialog } from '../components/client-edit-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const saveFunctionRef = useRef<(() => void) | null>(null);
  const { setCustomTitle } = useBreadcrumbs();

  const { data: client, isLoading, error, refetch } = useClient(clientId);

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
      <div className="flex-1 space-y-6">
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
      <div className="flex-1">
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
    <div className="flex-1 space-y-6">
      {/* Шапка с именем и действиями */}
      <ClientHeader
        client={client}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onCancelEdit={() => setIsEditing(false)}
        onSave={() => saveFunctionRef.current && saveFunctionRef.current()}
      />

      {/* Сетка с карточками информации */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка */}
        <div className="space-y-6">
          <ClientInfoCard
            client={client}
            isEditing={isEditing}
            onRefresh={refetch}
            onSaveSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
            onSaveRequest={(fn) => { saveFunctionRef.current = fn; }}
          />
        </div>

        {/* Правая колонка */}
        <div className="space-y-6">
          <ClientRelationsCard client={client} />
          <ClientNotesCard clientId={client.id} />
        </div>
      </div>

      {/* История активности на всю ширину */}
      <ClientHistoryCard client={client} />
    </div>
  );
}
