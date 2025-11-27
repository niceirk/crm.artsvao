'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  CreditCard,
  CalendarCheck,
  Receipt,
  AlertCircle,
  FileStack,
  ExternalLink,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  FileText,
  Phone,
  Mail,
  Archive,
} from 'lucide-react';
import { useClientInvoices } from '@/hooks/use-invoices';
import { useClientSubscriptions } from '@/hooks/use-subscriptions';
import { useAttendances } from '@/hooks/use-attendance';
import { useClientRelations } from '@/hooks/useClients';
import { useClientNotes } from '@/hooks/useClientNotes';
import { SellSubscriptionDialog } from '@/app/(dashboard)/subscriptions/components/sell-subscription-dialog';
import { SubscriptionDetailsSheet } from '@/app/(dashboard)/subscriptions/components/subscription-details-sheet';
import { AttendanceSheet } from '@/app/(dashboard)/schedule/attendance-sheet';
import type { Subscription } from '@/lib/types/subscriptions';
import { ClientInfoSection } from './client-info-section';
import { ClientRelationsSection } from './client-relations-section';
import { ClientNotesSection } from './client-notes-section';
import { ClientDocumentsSection } from './client-documents-section';
import { ClientArchivedSalesSection } from './client-archived-sales-section';
import type { Client } from '@/lib/types/clients';
import type { InvoiceStatus } from '@/lib/types/invoices';
import type { SubscriptionStatus } from '@/lib/types/subscriptions';
import type { Attendance, AttendanceStatus } from '@/lib/types/attendance';

interface ClientMainPanelProps {
  client: Client;
  isEditing: boolean;
  onRefresh?: () => void;
  onSaveSuccess: () => void;
  onCancel: () => void;
  onSaveRequest?: (saveFunction: () => void) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PARTIALLY_PAID: 'Частично оплачен',
  OVERDUE: 'Просрочен',
  CANCELLED: 'Отменен',
};

const statusVariants: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  PAID: 'default',
  PARTIALLY_PAID: 'secondary',
  OVERDUE: 'destructive',
  CANCELLED: 'outline',
};

const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Активен',
  EXPIRED: 'Истёк',
  FROZEN: 'Заморожен',
  CANCELLED: 'Отменён',
};

const subscriptionStatusVariants: Record<SubscriptionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  EXPIRED: 'secondary',
  FROZEN: 'outline',
  CANCELLED: 'destructive',
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Пропустил',
  EXCUSED: 'Уважительно',
};

const attendanceStatusVariants: Record<AttendanceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PRESENT: 'default',
  ABSENT: 'destructive',
  EXCUSED: 'secondary',
};

export function ClientMainPanel({
  client,
  isEditing,
  onRefresh,
  onSaveSuccess,
  onCancel,
  onSaveRequest,
  activeTab = 'main',
  onTabChange,
}: ClientMainPanelProps) {
  const router = useRouter();
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);

  // Состояние поиска и сортировки для каждой вкладки
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceSort, setInvoiceSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'issuedAt', order: 'desc' });
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');

  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [subscriptionSort, setSubscriptionSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'startDate', order: 'desc' });
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');

  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceSort, setAttendanceSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'date', order: 'desc' });
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('all');

  // Получаем данные
  const { data: invoices, isLoading: isLoadingInvoices } = useClientInvoices(client.id);
  const { data: subscriptionsResponse, isLoading: isLoadingSubscriptions } = useClientSubscriptions(client.id);
  const { data: attendanceResponse, isLoading: isLoadingAttendance, refetch: refetchAttendance } = useAttendances({
    clientId: client.id,
    limit: 100,
    page: 1,
  });

  const subscriptions = subscriptionsResponse?.data || [];
  const attendanceRecords = attendanceResponse?.data || [];
  const payments: any[] = [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  // Фильтрация и сортировка счетов
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    let result = [...invoices];

    // Фильтр по статусу
    if (invoiceStatusFilter !== 'all') {
      result = result.filter(inv => inv.status === invoiceStatusFilter);
    }

    // Поиск
    if (invoiceSearch) {
      const search = invoiceSearch.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search) ||
        inv.notes?.toLowerCase().includes(search)
      );
    }

    // Сортировка
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (invoiceSort.field) {
        case 'issuedAt':
          aVal = new Date(a.issuedAt).getTime();
          bVal = new Date(b.issuedAt).getTime();
          break;
        case 'totalAmount':
          aVal = Number(a.totalAmount);
          bVal = Number(b.totalAmount);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }
      if (invoiceSort.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [invoices, invoiceSearch, invoiceSort, invoiceStatusFilter]);

  // Фильтрация и сортировка абонементов
  const filteredSubscriptions = useMemo(() => {
    let result = [...subscriptions];

    // Фильтр по статусу
    if (subscriptionStatusFilter !== 'all') {
      result = result.filter(sub => sub.status === subscriptionStatusFilter);
    }

    // Поиск
    if (subscriptionSearch) {
      const search = subscriptionSearch.toLowerCase();
      result = result.filter(sub =>
        sub.subscriptionType.name.toLowerCase().includes(search) ||
        sub.group.name.toLowerCase().includes(search)
      );
    }

    // Сортировка
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (subscriptionSort.field) {
        case 'startDate':
          aVal = new Date(a.startDate).getTime();
          bVal = new Date(b.startDate).getTime();
          break;
        case 'endDate':
          aVal = new Date(a.endDate).getTime();
          bVal = new Date(b.endDate).getTime();
          break;
        case 'paidPrice':
          aVal = Number(a.paidPrice);
          bVal = Number(b.paidPrice);
          break;
        case 'remainingVisits':
          aVal = a.remainingVisits ?? 0;
          bVal = b.remainingVisits ?? 0;
          break;
        default:
          return 0;
      }
      if (subscriptionSort.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [subscriptions, subscriptionSearch, subscriptionSort, subscriptionStatusFilter]);

  // Фильтрация и сортировка посещений
  const filteredAttendance = useMemo(() => {
    let result = [...attendanceRecords];

    // Фильтр по статусу
    if (attendanceStatusFilter !== 'all') {
      result = result.filter(att => att.status === attendanceStatusFilter);
    }

    // Поиск
    if (attendanceSearch) {
      const search = attendanceSearch.toLowerCase();
      result = result.filter(att =>
        att.schedule.group?.name?.toLowerCase().includes(search) ||
        att.schedule.group?.studio?.name?.toLowerCase().includes(search)
      );
    }

    // Сортировка
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (attendanceSort.field) {
        case 'date':
          aVal = new Date(a.markedAt || a.createdAt).getTime();
          bVal = new Date(b.markedAt || b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      if (attendanceSort.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [attendanceRecords, attendanceSearch, attendanceSort, attendanceStatusFilter]);

  const toggleSort = (currentSort: { field: string; order: 'asc' | 'desc' }, field: string) => {
    if (currentSort.field === field) {
      return { field, order: currentSort.order === 'asc' ? 'desc' as const : 'asc' as const };
    }
    return { field, order: 'desc' as const };
  };

  const SortIcon = ({ field, currentSort }: { field: string; currentSort: { field: string; order: 'asc' | 'desc' } }) => {
    if (currentSort.field !== field) return <ArrowUpDown className="h-3 w-3" />;
    return currentSort.order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 space-y-3">
      <div className="flex justify-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-auto p-1">
            <TabsTrigger value="main" className="flex items-center gap-2 py-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Основное</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2 py-2">
              <FileStack className="h-4 w-4" />
              <span className="hidden sm:inline">Счета</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2 py-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Абонементы</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2 py-2">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Посещения</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 py-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Платежи</span>
            </TabsTrigger>
            <TabsTrigger value="archived-sales" className="flex items-center gap-2 py-2">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Архив</span>
            </TabsTrigger>
          </TabsList>

          {/* Вкладка "Основное" */}
          <TabsContent value="main" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Левая колонка */}
              <div className="space-y-6">
                <ClientInfoSection
                  client={client}
                  isEditing={isEditing}
                  onRefresh={onRefresh}
                  onSaveSuccess={onSaveSuccess}
                  onCancel={onCancel}
                  onSaveRequest={onSaveRequest}
                />
              </div>

              {/* Правая колонка */}
              <div className="space-y-6">
                <ClientRelationsSection client={client} />
                <ClientNotesSection clientId={client.id} />
                <ClientDocumentsSection client={client} onRefresh={onRefresh} />
              </div>
            </div>
          </TabsContent>

          {/* Вкладка "Счета" */}
          <TabsContent value="invoices" className="p-4">
            {/* Панель поиска и фильтров */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по номеру счета..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="DRAFT">Черновик</SelectItem>
                  <SelectItem value="PENDING">Ожидает оплаты</SelectItem>
                  <SelectItem value="PAID">Оплачен</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Частично оплачен</SelectItem>
                  <SelectItem value="OVERDUE">Просрочен</SelectItem>
                  <SelectItem value="CANCELLED">Отменен</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingInvoices ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <EmptyState message={invoiceSearch || invoiceStatusFilter !== 'all' ? 'Счета не найдены' : 'Нет счетов'} />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium hover:bg-transparent"
                          onClick={() => setInvoiceSort(toggleSort(invoiceSort, 'issuedAt'))}
                        >
                          Дата
                          <SortIcon field="issuedAt" currentSort={invoiceSort} />
                        </Button>
                      </TableHead>
                      <TableHead>Номер</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium hover:bg-transparent"
                          onClick={() => setInvoiceSort(toggleSort(invoiceSort, 'totalAmount'))}
                        >
                          Сумма
                          <SortIcon field="totalAmount" currentSort={invoiceSort} />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium hover:bg-transparent"
                          onClick={() => setInvoiceSort(toggleSort(invoiceSort, 'status'))}
                        >
                          Статус
                          <SortIcon field="status" currentSort={invoiceSort} />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <TableCell className="text-sm">
                          {format(new Date(invoice.issuedAt), 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[invoice.status]} className="text-xs">
                            {statusLabels[invoice.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Вкладка "Абонементы" */}
          <TabsContent value="subscriptions" className="p-4">
            {/* Панель поиска и фильтров */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию..."
                  value={subscriptionSearch}
                  onChange={(e) => setSubscriptionSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={subscriptionStatusFilter} onValueChange={setSubscriptionStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="ACTIVE">Активен</SelectItem>
                  <SelectItem value="EXPIRED">Истёк</SelectItem>
                  <SelectItem value="FROZEN">Заморожен</SelectItem>
                  <SelectItem value="CANCELLED">Отменён</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsSellDialogOpen(true)} size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-2" />
                Продать
              </Button>
            </div>

            {isLoadingSubscriptions ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <EmptyState message={subscriptionSearch || subscriptionStatusFilter !== 'all' ? 'Абонементы не найдены' : 'Нет абонементов'} />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Группа</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium hover:bg-transparent"
                          onClick={() => setSubscriptionSort(toggleSort(subscriptionSort, 'startDate'))}
                        >
                          Период
                          <SortIcon field="startDate" currentSort={subscriptionSort} />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium hover:bg-transparent"
                          onClick={() => setSubscriptionSort(toggleSort(subscriptionSort, 'remainingVisits'))}
                        >
                          Осталось
                          <SortIcon field="remainingVisits" currentSort={subscriptionSort} />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium hover:bg-transparent"
                          onClick={() => setSubscriptionSort(toggleSort(subscriptionSort, 'paidPrice'))}
                        >
                          Цена
                          <SortIcon field="paidPrice" currentSort={subscriptionSort} />
                        </Button>
                      </TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <TableRow
                        key={subscription.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedSubscription(subscription as Subscription)}
                      >
                        <TableCell className="font-medium text-sm">
                          {subscription.subscriptionType.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {subscription.group.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(subscription.startDate), 'dd.MM', { locale: ru })} - {format(new Date(subscription.endDate), 'dd.MM.yy', { locale: ru })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined
                            ? `${subscription.remainingVisits} пос.`
                            : '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(subscription.paidPrice)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={subscriptionStatusVariants[subscription.status]} className="text-xs">
                            {subscriptionStatusLabels[subscription.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Вкладка "Посещения" */}
          <TabsContent value="attendance" className="p-4">
            {/* Статистика */}
            {attendanceRecords.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="rounded-lg border p-2 text-center">
                  <div className="text-xl font-bold text-green-600">
                    {attendanceRecords.filter(a => a.status === 'PRESENT').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Присутствовали</div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <div className="text-xl font-bold text-red-600">
                    {attendanceRecords.filter(a => a.status === 'ABSENT').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Пропустили</div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <div className="text-xl font-bold text-yellow-600">
                    {attendanceRecords.filter(a => a.status === 'EXCUSED').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Уважительных</div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {attendanceRecords.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Всего</div>
                </div>
              </div>
            )}

            {/* Панель поиска и фильтров */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по группе..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={attendanceStatusFilter} onValueChange={setAttendanceStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="PRESENT">Присутствовал</SelectItem>
                  <SelectItem value="ABSENT">Пропустил</SelectItem>
                  <SelectItem value="EXCUSED">Уважительно</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingAttendance ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredAttendance.length === 0 ? (
              <EmptyState message={attendanceSearch || attendanceStatusFilter !== 'all' ? 'Посещения не найдены' : 'Посещений пока нет'} />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium hover:bg-transparent"
                          onClick={() => setAttendanceSort(toggleSort(attendanceSort, 'date'))}
                        >
                          Дата
                          <SortIcon field="date" currentSort={attendanceSort} />
                        </Button>
                      </TableHead>
                      <TableHead>Время</TableHead>
                      <TableHead>Группа</TableHead>
                      <TableHead>Студия</TableHead>
                      <TableHead>Основание</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record: Attendance) => {
                      const dateTime = record.markedAt
                        ? new Date(record.markedAt)
                        : new Date(record.createdAt);
                      const timeString = record.schedule.startTime
                        ? new Date(record.schedule.startTime).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';
                      const basis = record.subscription
                        ? `${record.subscription.subscriptionType.type === 'SINGLE_VISIT' ? 'Разовое' : 'Абонемент'}`
                        : 'Без абонемента';

                      return (
                        <TableRow
                          key={record.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedAttendance(record)}
                        >
                          <TableCell className="text-sm">
                            {format(dateTime, 'dd.MM.yyyy', { locale: ru })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {timeString}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.schedule.group?.name ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.schedule.group?.studio?.name ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {basis}
                          </TableCell>
                          <TableCell>
                            <Badge variant={attendanceStatusVariants[record.status]} className="text-xs">
                              {attendanceStatusLabels[record.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Вкладка "Платежи" */}
          <TabsContent value="payments" className="p-4">
            {payments.length === 0 ? (
              <EmptyState message="Нет платежей" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Способ</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Вкладка "Архив продаж" */}
          <TabsContent value="archived-sales" className="p-4">
            <ClientArchivedSalesSection clientId={client.id} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <SellSubscriptionDialog
        open={isSellDialogOpen}
        onOpenChange={setIsSellDialogOpen}
        preselectedClientId={client.id}
      />

      {selectedSubscription && (
        <SubscriptionDetailsSheet
          subscription={selectedSubscription}
          open={!!selectedSubscription}
          onOpenChange={(open) => !open && setSelectedSubscription(null)}
        />
      )}

      {selectedAttendance && (
        <AttendanceSheet
          open={!!selectedAttendance}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAttendance(null);
              refetchAttendance();
            }
          }}
          scheduleId={selectedAttendance.scheduleId}
          groupId={selectedAttendance.schedule.group?.id || ''}
          groupName={selectedAttendance.schedule.group?.name || 'Занятие'}
          startTime={selectedAttendance.schedule.startTime}
          scheduleDate={format(new Date(selectedAttendance.markedAt || selectedAttendance.createdAt), 'yyyy-MM-dd')}
        />
      )}
    </Card>
  );
}
