'use client';

import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeleteClient } from '@/hooks/useClients';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Client } from '@/lib/types/clients';

interface ClientHeaderProps {
  client: Client;
  onEdit: () => void;
}

const statusLabels: Record<Client['status'], string> = {
  ACTIVE: 'Активен',
  INACTIVE: 'Неактивен',
  VIP: 'VIP',
};

const statusVariants: Record<Client['status'], 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  VIP: 'default',
};

export function ClientHeader({ client, onEdit }: ClientHeaderProps) {
  const router = useRouter();
  const deleteClient = useDeleteClient();

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(client.id);
      router.push('/clients');
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  const fullName = [client.lastName, client.firstName, client.middleName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{fullName}</h1>
            <Badge variant={statusVariants[client.status]}>
              {statusLabels[client.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Клиент с {new Date(client.createdAt).toLocaleDateString('ru-RU')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onEdit} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Редактировать
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить клиента {fullName}?
                Клиент будет помечен как неактивный.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
