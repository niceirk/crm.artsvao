'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useGroups } from '@/hooks/use-groups';
import { SellSubscriptionDialog } from './components/sell-subscription-dialog';
import { SubscriptionDetailsSheet } from './components/subscription-details-sheet';
import { searchClients } from '@/lib/api/clients';
import type {
  SubscriptionStatus,
  Subscription,
  SubscriptionFilterDto,
} from '@/lib/types/subscriptions';
import { cn } from '@/lib/utils';

const statusDotClass: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-green-500',
  EXPIRED: 'bg-secondary',
  FROZEN: 'bg-muted-foreground',
  CANCELLED: 'bg-destructive',
};

export default function SubscriptionsPage() {
  const [showExpired, setShowExpired] = useState(false);
  const [groupFilter, setGroupFilter] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientLabel, setSelectedClientLabel] = useState('');
  const [clientOptions, setClientOptions] = useState<ComboboxOption[]>([]);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(
    null,
  );

  const { data: groupsResponse } = useGroups();
  const groups = groupsResponse?.data ?? [];

  const groupOptions = useMemo(() => {
    const normalizedSearch = groupSearch.trim().toLowerCase();
    return groups
      .filter((group) => {
        if (!normalizedSearch) return true;
        const label = `${group.name} ${group.studio.name}`.toLowerCase();
        return label.includes(normalizedSearch);
      })
      .map((group) => ({
        value: group.id,
        label: group.name,
      }));
  }, [groups, groupSearch]);

  useEffect(() => {
    let active = true;

    if (!clientSearch) {
      setClientOptions(
        selectedClientId
          ? [
              {
                value: selectedClientId,
                label: selectedClientLabel,
              },
            ]
          : [],
      );
      setIsClientLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsClientLoading(true);
        const clients = await searchClients(clientSearch);
        if (!active) return;
        const options = clients.map((client) => ({
          value: client.id,
          label: `${client.lastName} ${client.firstName} (${client.phone})`,
        }));
        if (
          selectedClientId &&
          !options.some((option) => option.value === selectedClientId)
        ) {
          options.unshift({
            value: selectedClientId,
            label: selectedClientLabel,
          });
        }
        setClientOptions(options);
      } catch (error) {
        console.error('Не удалось найти клиентов:', error);
      } finally {
        if (active) {
          setIsClientLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [clientSearch, selectedClientId, selectedClientLabel]);

  const filters = useMemo(() => {
    const applied: SubscriptionFilterDto = {
      sortBy: 'purchaseDate',
      sortOrder,
    };

    if (groupFilter) {
      applied.groupId = groupFilter;
    }

    if (selectedClientId) {
      applied.clientId = selectedClientId;
    }

    if (!showExpired) {
      applied.statusCategory = 'ACTIVE';
    }

    return applied;
  }, [groupFilter, selectedClientId, showExpired, sortOrder]);

  const { data: subscriptionsResponse, isLoading } =
    useSubscriptions(filters);

  const subscriptions = subscriptionsResponse?.data;
  const meta = subscriptionsResponse?.meta;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const handleViewDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Абонементы</h2>
          <p className="text-muted-foreground">
            Управление абонементами клиентов
          </p>
        </div>
        <Button onClick={() => setIsSellDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Продать абонемент
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список абонементов</CardTitle>
              <CardDescription>
                Всего абонементов: {meta?.total || 0}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <Combobox
              options={clientOptions}
              value={selectedClientId || undefined}
              onValueChange={(value) => {
                if (!value) {
                  setSelectedClientId('');
                  setSelectedClientLabel('');
                  return;
                }
                const option = clientOptions.find((item) => item.value === value);
                setSelectedClientId(value);
                setSelectedClientLabel(option?.label ?? '');
              }}
              placeholder="Поиск клиента"
              searchValue={clientSearch}
              onSearchChange={setClientSearch}
              emptyText="Клиент не найден"
              allowEmpty
              disabled={isClientLoading}
              className="min-w-[220px] max-w-[360px] flex-1"
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={showExpired}
                onCheckedChange={(checked) => setShowExpired(Boolean(checked))}
              />
              <span className="text-sm text-muted-foreground">Показать истекшие</span>
            </div>
            <Combobox
              options={[
                { value: '', label: 'Все группы' },
                ...groupOptions,
              ]}
              value={groupFilter || ''}
              onValueChange={(value) => {
                setGroupFilter(value || '');
              }}
              placeholder="Группа"
              searchValue={groupSearch}
              onSearchChange={setGroupSearch}
              emptyText="Группа не найдена"
              allowEmpty
              className="min-w-[220px] max-w-[360px] flex-1"
            />
            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as 'desc' | 'asc')}
            >
              <SelectTrigger className="w-[230px]">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Дата покупки: новые сверху</SelectItem>
                <SelectItem value="asc">Дата покупки: старые сверху</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div>Загрузка...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата покупки</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Группа</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-center">Посещений</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((subscription) => (
                  <TableRow
                    key={subscription.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(subscription)}
                  >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block h-2.5 w-2.5 rounded-full',
                          statusDotClass[subscription.status],
                        )}
                      />
                      <span className="text-sm">{format(new Date(subscription.purchaseDate), 'dd.MM.yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {subscription.client.lastName} {subscription.client.firstName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {subscription.client.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{subscription.subscriptionType.name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{subscription.group.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {subscription.group.studio.name}
                      </span>
                    </div>
                  </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>
                          {format(new Date(subscription.startDate), 'dd MMM', {
                            locale: ru,
                          })}{' '}
                          -{' '}
                          {format(new Date(subscription.endDate), 'dd MMM yyyy', {
                            locale: ru,
                          })}
                        </span>
                        {subscription.purchasedMonths > 1 && (
                          <span className="text-muted-foreground">
                            {subscription.purchasedMonths} мес.
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{formatCurrency(subscription.paidPrice)}</span>
                        {subscription.discountAmount > 0 && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatCurrency(subscription.originalPrice)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {subscription.remainingVisits !== null &&
                      subscription.remainingVisits !== undefined ? (
                        <Badge variant="outline">{subscription.remainingVisits}</Badge>
                      ) : (
                        <span className="text-muted-foreground">∞</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SellSubscriptionDialog
        open={isSellDialogOpen}
        onOpenChange={setIsSellDialogOpen}
      />

      {selectedSubscription && (
        <SubscriptionDetailsSheet
          subscription={selectedSubscription}
          open={!!selectedSubscription}
          onOpenChange={(open) => !open && setSelectedSubscription(null)}
        />
      )}
    </div>
  );
}
