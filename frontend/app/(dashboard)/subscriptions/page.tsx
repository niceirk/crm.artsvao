'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Banknote, ShoppingCart, ChevronDown, CreditCard, MoreHorizontal, Trash2, Eye, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { SellSingleSessionsDialog } from './components/sell-single-sessions-dialog';
import { SellServiceDialog } from './components/sell-service-dialog';
import { SubscriptionDetailsSheet } from './components/subscription-details-sheet';
import { DeleteSubscriptionDialog } from './components/delete-subscription-dialog';
import type {
  SubscriptionStatus,
  Subscription,
  SubscriptionFilterDto,
} from '@/lib/types/subscriptions';
import { cn } from '@/lib/utils';

export default function SubscriptionsPage() {
  const [showExpired, setShowExpired] = useState(false);
  const [groupFilter, setGroupFilter] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [isPackDialogOpen, setIsPackDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(
    null,
  );
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<string | null>(null);

  const { data: groupsResponse } = useGroups({ limit: 1000 });
  const groups = groupsResponse?.data ?? [];

  const groupOptions = useMemo(() => {
    const normalizedSearch = groupSearch.trim().toLowerCase();
    return groups
      .filter((group) => {
        if (!normalizedSearch) return true;
        const label = `${group.name} ${group.studio?.name ?? ''}`.toLowerCase();
        return label.includes(normalizedSearch);
      })
      .map((group) => ({
        value: group.id,
        label: group.name,
      }));
  }, [groups, groupSearch]);

  // Генерация списка месяцев для фильтра (текущий месяц + 2 месяца назад + 1 вперёд)
  const monthOptions = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();

    for (let i = -3; i <= 1; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'LLLL yyyy', { locale: ru });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }

    return months;
  }, []);

  const filters = useMemo(() => {
    const applied: SubscriptionFilterDto = {
      sortBy: 'purchaseDate',
      sortOrder,
      limit: 1000,
    };

    if (groupFilter) {
      applied.groupId = groupFilter;
    }

    if (monthFilter) {
      applied.validMonth = monthFilter;
    }

    // Показывать только активные, если:
    // - не включен showExpired
    // - не выбран фильтр по месяцу
    // - нет поиска по клиенту
    if (!showExpired && !monthFilter && !clientSearch.trim()) {
      applied.statusCategory = 'ACTIVE';
    }

    return applied;
  }, [groupFilter, monthFilter, showExpired, sortOrder, clientSearch]);

  const { data: subscriptionsResponse, isLoading } =
    useSubscriptions(filters);

  const allSubscriptions = subscriptionsResponse?.data;
  const meta = subscriptionsResponse?.meta;

  // Локальная фильтрация по клиенту
  const subscriptions = useMemo(() => {
    if (!allSubscriptions) return [];
    if (!clientSearch.trim()) return allSubscriptions;

    const search = clientSearch.trim().toLowerCase();
    return allSubscriptions.filter((sub) => {
      const fullName = `${sub.client.lastName} ${sub.client.firstName}`.toLowerCase();
      const phone = sub.client.phone?.toLowerCase() || '';
      return fullName.includes(search) || phone.includes(search);
    });
  }, [allSubscriptions, clientSearch]);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Продать
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsSellDialogOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Абонемент
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsPackDialogOpen(true)}>
              <Banknote className="h-4 w-4 mr-2" />
              Разовое посещение
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsServiceDialogOpen(true)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Услугу
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <div className="relative min-w-[220px] max-w-[360px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по клиенту..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-9"
              />
            </div>
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
              value={monthFilter || 'all'}
              onValueChange={(value) => setMonthFilter(value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все месяцы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все месяцы</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead className="w-[90px]">№</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата покупки</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Цена 1 занятия</TableHead>
                  <TableHead className="text-center">Посещений</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((subscription) => (
                  <TableRow
                    key={subscription.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(subscription)}
                  >
                  <TableCell className="text-sm text-muted-foreground">
                    {subscription.subscriptionNumber?.toString().padStart(7, '0') || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <SubscriptionStatusBadge status={subscription.status} size="sm" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{format(parseISO(subscription.purchaseDate), 'dd.MM.yyyy')}</span>
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
                      <div className="flex flex-col text-sm">
                        {/* Название месяца для безлимитных абонементов */}
                        {subscription.subscriptionType.type === 'UNLIMITED' && (
                          <span className="font-medium text-primary capitalize">
                            {format(parseISO(subscription.startDate), 'LLLL', { locale: ru })}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {format(parseISO(subscription.startDate), 'dd.MM', { locale: ru })} - {format(parseISO(subscription.endDate), 'dd.MM.yy', { locale: ru })}
                        </span>
                        {subscription.purchasedMonths > 1 && (
                          <span className="text-xs text-muted-foreground">
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
                    <TableCell className="text-right">
                      {subscription.subscriptionType.pricePerLesson ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-primary">
                            {formatCurrency(
                              subscription.subscriptionType.pricePerLesson *
                                (1 - (subscription.client.benefitCategory?.discountPercent || 0) / 100)
                            )}
                          </span>
                          {subscription.client.benefitCategory?.discountPercent ? (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(subscription.subscriptionType.pricePerLesson)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {subscription.remainingVisits !== null &&
                      subscription.remainingVisits !== undefined ? (
                        <Badge variant="outline">{subscription.remainingVisits}</Badge>
                      ) : (
                        <span className="text-muted-foreground">∞</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(subscription);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Подробнее
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSubscriptionId(subscription.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        onlyUnlimited={true}
      />

      <SellSingleSessionsDialog
        open={isPackDialogOpen}
        onOpenChange={setIsPackDialogOpen}
      />

      <SellServiceDialog
        open={isServiceDialogOpen}
        onOpenChange={setIsServiceDialogOpen}
      />

      {selectedSubscription && (
        <SubscriptionDetailsSheet
          subscription={selectedSubscription}
          open={!!selectedSubscription}
          onOpenChange={(open) => !open && setSelectedSubscription(null)}
        />
      )}

      <DeleteSubscriptionDialog
        subscriptionId={deletingSubscriptionId}
        open={!!deletingSubscriptionId}
        onOpenChange={(open) => !open && setDeletingSubscriptionId(null)}
      />
    </div>
  );
}
