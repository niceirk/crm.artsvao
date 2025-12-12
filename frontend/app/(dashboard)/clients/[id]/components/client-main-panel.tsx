'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, isSameMonth, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceStatusBadge, SubscriptionStatusBadge, AttendanceStatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
  Trash2,
  Check,
} from 'lucide-react';
import { useClientInvoices, useMarkAsPaid } from '@/hooks/use-invoices';
import { useClientSubscriptions } from '@/hooks/use-subscriptions';
import { useAttendances } from '@/hooks/use-attendance';
import { useClientRelations } from '@/hooks/useClients';
import { useClientNotes } from '@/hooks/useClientNotes';
import { SellSubscriptionDialog } from '@/app/(dashboard)/subscriptions/components/sell-subscription-dialog';
import { SubscriptionDetailsSheet } from '@/app/(dashboard)/subscriptions/components/subscription-details-sheet';
import { DeleteSubscriptionDialog } from '@/app/(dashboard)/subscriptions/components/delete-subscription-dialog';
import { AttendanceSheet } from '@/app/(dashboard)/schedule/attendance-sheet';
import type { Subscription } from '@/lib/types/subscriptions';
import { ClientInfoSection } from './client-info-section';
import { ClientRelationsSection } from './client-relations-section';
import { ClientNotesSection } from './client-notes-section';
import { ClientDocumentsSection } from './client-documents-section';
import { ClientArchivedSalesSection } from './client-archived-sales-section';
import { ClientMedicalCertificatesSection } from './client-medical-certificates-section';
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
  const [deleteSubscriptionId, setDeleteSubscriptionId] = useState<string | null>(null);

  // Состояние поиска и сортировки для каждой вкладки
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceSort, setInvoiceSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'issuedAt', order: 'desc' });
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [subscriptionSort, setSubscriptionSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'startDate', order: 'desc' });
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');

  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceSort, setAttendanceSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'date', order: 'desc' });
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('all');
  const [attendanceMonthFilter, setAttendanceMonthFilter] = useState<Date | null>(null);

  // Получаем данные
  const { data: invoices, isLoading: isLoadingInvoices } = useClientInvoices(client.id);
  const markAsPaid = useMarkAsPaid();
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

  // Сумма всех выделенных счетов
  const selectedInvoicesTotal = useMemo(() => {
    if (!invoices || selectedInvoiceIds.size === 0) return 0;
    return invoices
      .filter(inv => selectedInvoiceIds.has(inv.id))
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  }, [invoices, selectedInvoiceIds]);

  // Количество неоплаченных среди выделенных (для кнопки массовой оплаты)
  const selectedUnpaidCount = useMemo(() => {
    if (!invoices || selectedInvoiceIds.size === 0) return 0;
    return invoices.filter(
      inv => selectedInvoiceIds.has(inv.id) && inv.status !== 'PAID'
    ).length;
  }, [invoices, selectedInvoiceIds]);

  // Выбрать/снять все видимые счета
  const handleSelectAllInvoices = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedInvoiceIds);
      filteredInvoices.forEach(inv => newSelected.add(inv.id));
      setSelectedInvoiceIds(newSelected);
    } else {
      const newSelected = new Set(selectedInvoiceIds);
      filteredInvoices.forEach(inv => newSelected.delete(inv.id));
      setSelectedInvoiceIds(newSelected);
    }
  };

  // Выбрать/снять один счет
  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoiceIds);
    checked ? newSelected.add(invoiceId) : newSelected.delete(invoiceId);
    setSelectedInvoiceIds(newSelected);
  };

  // Проверка: все ли видимые счета выбраны
  const isAllInvoicesSelected = filteredInvoices.length > 0 &&
    filteredInvoices.every(inv => selectedInvoiceIds.has(inv.id));

  // Массовая оплата выделенных счетов
  const handleMarkSelectedAsPaid = async () => {
    const unpaidIds = invoices
      ?.filter(inv => selectedInvoiceIds.has(inv.id) && inv.status !== 'PAID')
      .map(inv => inv.id) || [];

    for (const id of unpaidIds) {
      await markAsPaid.mutateAsync(id);
    }
    setSelectedInvoiceIds(new Set());
  };

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

  // Доступные месяцы из посещений
  const availableAttendanceMonths = useMemo(() => {
    const months: Date[] = [];
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.schedule.date);
      const monthStart = startOfMonth(recordDate);
      if (!months.some(m => isSameMonth(m, monthStart))) {
        months.push(monthStart);
      }
    });
    return months.sort((a, b) => b.getTime() - a.getTime());
  }, [attendanceRecords]);

  // Фильтрация и сортировка посещений
  const filteredAttendance = useMemo(() => {
    let result = [...attendanceRecords];

    // Фильтр по месяцу
    if (attendanceMonthFilter) {
      result = result.filter(att =>
        isSameMonth(new Date(att.schedule.date), attendanceMonthFilter)
      );
    }

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
          aVal = new Date(a.schedule.date).getTime();
          bVal = new Date(b.schedule.date).getTime();
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
  }, [attendanceRecords, attendanceSearch, attendanceSort, attendanceStatusFilter, attendanceMonthFilter]);

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
                <ClientMedicalCertificatesSection clientId={client.id} onRefresh={onRefresh} />
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
                  <SelectItem value="UNPAID">Не оплачен</SelectItem>
                  <SelectItem value="PAID">Оплачен</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Частично оплачен</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Панель выделенных счетов */}
            {selectedInvoiceIds.size > 0 && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2 mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Выбрано: <span className="font-medium text-foreground">{selectedInvoiceIds.size}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Сумма: <span className="font-medium text-foreground">{formatCurrency(selectedInvoicesTotal)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUnpaidCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={handleMarkSelectedAsPaid}
                      disabled={markAsPaid.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Оплачено ({selectedUnpaidCount})
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedInvoiceIds(new Set())}>
                    Снять выбор
                  </Button>
                </div>
              </div>
            )}

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
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={isAllInvoicesSelected}
                          onCheckedChange={handleSelectAllInvoices}
                        />
                      </TableHead>
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
                      <TableHead>Состав</TableHead>
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
                      <TableHead className="w-[80px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          selectedInvoiceIds.has(invoice.id) && "bg-muted/30"
                        )}
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(invoice.issuedAt), 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {invoice.items?.map(item => item.serviceName).join(', ') || '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} size="sm" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {invoice.status !== 'PAID' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsPaid.mutate(invoice.id);
                                }}
                                disabled={markAsPaid.isPending}
                                title="Отметить как оплаченный"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
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
                      <TableHead className="w-[80px]">№</TableHead>
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
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <TableRow
                        key={subscription.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell
                          className="text-sm text-muted-foreground cursor-pointer"
                          onClick={() => setSelectedSubscription(subscription as Subscription)}
                        >
                          {subscription.subscriptionNumber?.toString().padStart(7, '0') || '—'}
                        </TableCell>
                        <TableCell
                          className="font-medium text-sm cursor-pointer"
                          onClick={() => setSelectedSubscription(subscription as Subscription)}
                        >
                          {subscription.subscriptionType.name}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground cursor-pointer"
                          onClick={() => setSelectedSubscription(subscription as Subscription)}
                        >
                          {subscription.group.name}
                        </TableCell>
                        <TableCell
                          className="text-sm cursor-pointer"
                          onClick={() => setSelectedSubscription(subscription as Subscription)}
                        >
                          <div className="flex flex-col">
                            {subscription.subscriptionType.type === 'UNLIMITED' && (
                              <span className="font-medium text-primary text-xs capitalize">
                                {format(parseISO(subscription.startDate), 'LLLL', { locale: ru })}
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              {format(parseISO(subscription.startDate), 'dd.MM', { locale: ru })} - {format(parseISO(subscription.endDate), 'dd.MM.yy', { locale: ru })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-sm cursor-pointer"
                          onClick={() => setSelectedSubscription(subscription as Subscription)}
                        >
                          {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined
                            ? `${subscription.remainingVisits} пос.`
                            : '—'}
                        </TableCell>
                        <TableCell
                          className="font-medium cursor-pointer"
                          onClick={() => setSelectedSubscription(subscription as Subscription)}
                        >
                          {formatCurrency(subscription.paidPrice)}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => setSelectedSubscription(subscription as Subscription)}
                        >
                          <SubscriptionStatusBadge status={subscription.status} size="sm" />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSubscriptionId(subscription.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

            {/* Фильтр по месяцам */}
            {availableAttendanceMonths.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-4">
                <span className="text-muted-foreground">Месяц:</span>
                <button
                  onClick={() => setAttendanceMonthFilter(null)}
                  className={`border-b border-dashed transition-colors ${
                    attendanceMonthFilter === null
                      ? 'text-foreground border-foreground font-medium'
                      : 'text-muted-foreground border-muted-foreground/50 hover:text-foreground hover:border-foreground'
                  }`}
                >
                  Все
                </button>
                {availableAttendanceMonths.map((month) => (
                  <button
                    key={month.toISOString()}
                    onClick={() => setAttendanceMonthFilter(month)}
                    className={`border-b border-dashed transition-colors ${
                      attendanceMonthFilter && isSameMonth(attendanceMonthFilter, month)
                        ? 'text-foreground border-foreground font-medium'
                        : 'text-muted-foreground border-muted-foreground/50 hover:text-foreground hover:border-foreground'
                    }`}
                  >
                    {format(month, 'LLLL yyyy', { locale: ru })}
                  </button>
                ))}
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
                          Дата занятия
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
                      const scheduleDate = new Date(record.schedule.date);
                      const timeString = record.schedule.startTime
                        ? new Date(record.schedule.startTime).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';
                      const basis = record.subscription
                        ? `${record.subscription.subscriptionType.type === 'VISIT_PACK' ? 'Пакет' : 'Абонемент'}`
                        : 'Без абонемента';

                      return (
                        <TableRow
                          key={record.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedAttendance(record)}
                        >
                          <TableCell className="text-sm">
                            {format(scheduleDate, 'dd.MM.yyyy', { locale: ru })}
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
                            <AttendanceStatusBadge status={record.status} size="sm" />
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

      <DeleteSubscriptionDialog
        subscriptionId={deleteSubscriptionId}
        open={!!deleteSubscriptionId}
        onOpenChange={(open) => {
          if (!open) setDeleteSubscriptionId(null);
        }}
        onDeleted={() => {
          setDeleteSubscriptionId(null);
          onRefresh?.();
        }}
      />
    </Card>
  );
}
