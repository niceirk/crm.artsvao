'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Client } from '@/lib/types/clients';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteClient } from '@/hooks/useClients';
import { ClientEditDialog } from './client-edit-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ClientsTableProps {
  clients: Client[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ClientsTable({
  clients,
  currentPage,
  totalPages,
  onPageChange,
}: ClientsTableProps) {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const deleteClient = useDeleteClient();

  const handleDelete = () => {
    if (deletingClientId) {
      deleteClient.mutate(deletingClientId, {
        onSuccess: () => {
          setDeletingClientId(null);
        },
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ACTIVE: 'default',
      VIP: 'secondary',
      INACTIVE: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/clients/${client.id}`}
                      className="hover:underline"
                    >
                      {client.lastName} {client.firstName} {client.middleName}
                    </Link>
                  </TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.email || '—'}</TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell>{formatDate(client.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          ⋮
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>
                            Открыть
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingClient(client)}>
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingClientId(client.id)}
                        >
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Страница {currentPage} из {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Вперед
            </Button>
          </div>
        </div>
      )}

      {editingClient && (
        <ClientEditDialog
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
        />
      )}

      <AlertDialog open={!!deletingClientId} onOpenChange={(open) => !open && setDeletingClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие пометит клиента как неактивного. Данные не будут физически удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
