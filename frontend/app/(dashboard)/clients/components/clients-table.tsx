'use client';

import { useRouter } from 'next/navigation';
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
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import { formatPhoneNumber } from '@/lib/utils/phone';

interface ClientsTableProps {
  clients: Client[];
  currentPage: number;
  totalPages: number;
  sortBy?: 'name' | 'createdAt' | 'dateOfBirth' | 'status';
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: 'name' | 'createdAt' | 'dateOfBirth' | 'status') => void;
}

export function ClientsTable({
  clients,
  currentPage,
  totalPages,
  sortBy,
  sortOrder,
  onPageChange,
  onSortChange,
}: ClientsTableProps) {
  const router = useRouter();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const deleteClient = useDeleteClient();

  const handleRowClick = (clientId: string, e: React.MouseEvent) => {
    // Ignore clicks on buttons and their children
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    // Open in new tab if Ctrl (or Cmd on Mac) is pressed
    if (e.ctrlKey || e.metaKey) {
      window.open(`/clients/${clientId}`, '_blank');
      return;
    }

    router.push(`/clients/${clientId}`);
  };

  const handleSort = (field: 'name' | 'createdAt' | 'dateOfBirth' | 'status') => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  const getSortIcon = (field: 'name' | 'createdAt' | 'dateOfBirth' | 'status') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const SortableHeader = ({
    field,
    children
  }: {
    field: 'name' | 'createdAt' | 'dateOfBirth' | 'status';
    children: React.ReactNode;
  }) => (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => handleSort(field)}
        className="hover:bg-transparent p-0 h-auto font-medium"
      >
        {children}
        {getSortIcon(field)}
      </Button>
    </TableHead>
  );

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

  const calculateAge = (dateOfBirth: string | null | undefined) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="name">Имя</SortableHeader>
              <SortableHeader field="dateOfBirth">Дата рождения</SortableHeader>
              <SortableHeader field="dateOfBirth">Возраст</SortableHeader>
              <TableHead>Телефон</TableHead>
              <TableHead>Email</TableHead>
              <SortableHeader field="status">Статус</SortableHeader>
              <SortableHeader field="createdAt">Дата создания</SortableHeader>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => {
                const age = calculateAge(client.dateOfBirth);
                return (
                  <TableRow
                    key={client.id}
                    onClick={(e) => handleRowClick(client.id, e)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {client.lastName} {client.firstName} {client.middleName}
                    </TableCell>
                    <TableCell>
                      {client.dateOfBirth ? formatDate(client.dateOfBirth) : '—'}
                    </TableCell>
                    <TableCell>
                      {age !== null ? `${age} лет` : '—'}
                    </TableCell>
                    <TableCell>{formatPhoneNumber(client.phone)}</TableCell>
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
                );
              })
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
