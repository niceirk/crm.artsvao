'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { groupsApi, type GroupAvailability } from '@/lib/api/groups';
import { getClients, type Client } from '@/lib/api/clients';
import { toast } from '@/lib/utils/toast';
import { Loader2, AlertCircle, UserPlus, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onSuccess: () => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  groupId,
  onSuccess,
}: AddMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [availability, setAvailability] = useState<GroupAvailability | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Преобразуем клиентов в опции для Combobox
  const clientOptions: ComboboxOption[] = useMemo(() => {
    return clients.map(client => ({
      value: client.id,
      label: `${client.lastName} ${client.firstName} ${client.middleName || ''} (${client.phone})`.trim()
    }));
  }, [clients]);

  // Загрузка данных при открытии диалога
  useEffect(() => {
    if (open) {
      loadData();
    } else {
      // Сброс при закрытии
      setSelectedClientId('');
    }
  }, [open, groupId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [clientsData, availabilityData] = await Promise.all([
        getClients({ limit: 10000, page: 1 }), // Загружаем всех клиентов
        groupsApi.checkGroupAvailability(groupId),
      ]);

      // clientsData - это ClientsListResponse с полем data
      const clientsList = clientsData?.data || [];

      console.log('Loaded clients:', clientsList);
      setClients(clientsList);
      setAvailability(availabilityData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast.error('Выберите клиента');
      return;
    }

    try {
      setLoading(true);
      const result = await groupsApi.addGroupMember(groupId, selectedClientId);

      if (result.waitlisted) {
        toast.success(`Участник добавлен в лист ожидания (позиция ${result.position})`);
      } else {
        toast.success('Участник успешно добавлен в группу');
      }

      onSuccess();
      onOpenChange(false);
      setSelectedClientId('');
    } catch (error: any) {
      console.error('Failed to add member:', error);
      const errorMessage = error.response?.data?.message || 'Не удалось добавить участника';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Добавить участника в группу
          </DialogTitle>
          <DialogDescription>
            Выберите клиента для добавления в группу
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Информация о доступности */}
            {availability && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Доступность мест</span>
                  </div>
                  <span className="text-sm font-bold">
                    {availability.occupied} / {availability.total}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Свободно:</span>
                  <span className={availability.available > 0 ? 'text-green-600' : 'text-amber-600'}>
                    {availability.available} {availability.available === 1 ? 'место' : 'мест'}
                  </span>
                </div>
              </div>
            )}

            {/* Предупреждение о заполненной группе */}
            {availability?.isFull && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Группа заполнена. Участник будет добавлен в лист ожидания и автоматически переведен в активные при освобождении места.
                </AlertDescription>
              </Alert>
            )}

            {/* Выбор клиента */}
            <div className="space-y-2">
              <Label htmlFor="clientId">Клиент *</Label>
              <Combobox
                options={clientOptions}
                value={selectedClientId}
                onValueChange={(value) => setSelectedClientId(value || '')}
                placeholder="Выберите клиента"
                searchPlaceholder="Поиск клиента..."
                emptyText="Клиент не найден"
                allowEmpty={false}
                disabled={clients.length === 0}
              />
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Нет доступных клиентов
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading || clients.length === 0}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {availability?.isFull ? 'Добавить в очередь' : 'Добавить участника'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
