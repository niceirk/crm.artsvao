'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Search } from 'lucide-react';
import { useClientArchivedSales, useClientArchivedSalesSummary } from '@/hooks/useArchivedSales';
import type { ArchivedSale } from '@/lib/types/archived-sales';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface Props {
  clientId: string;
}

const MONTHS = [
  { value: '1', label: 'Январь' },
  { value: '2', label: 'Февраль' },
  { value: '3', label: 'Март' },
  { value: '4', label: 'Апрель' },
  { value: '5', label: 'Май' },
  { value: '6', label: 'Июнь' },
  { value: '7', label: 'Июль' },
  { value: '8', label: 'Август' },
  { value: '9', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
];

type SortField = 'saleDate' | 'saleNumber';
type SortOrder = 'asc' | 'desc';

export function ClientArchivedSalesSection({ clientId }: Props) {
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<ArchivedSale | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('saleDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { data: summary } = useClientArchivedSalesSummary(clientId);

  const years = useMemo(() => {
    if (!summary?.yearBreakdown) return [];
    return summary.yearBreakdown.map((y) => y.year);
  }, [summary]);

  const { data: salesData, isLoading } = useClientArchivedSales(clientId, {
    page,
    sortBy,
    sortOrder,
    year: selectedYear,
    month: selectedMonth,
    search: debouncedSearch || undefined,
  });

  // Сброс страницы при изменении поиска
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleYearClick = (year: number) => {
    if (selectedYear === year) {
      setSelectedYear(undefined);
      setSelectedMonth(undefined);
    } else {
      setSelectedYear(year);
      setSelectedMonth(undefined);
    }
    setPage(1);
  };

  const handleMonthChange = (value: string) => {
    if (value === 'all') {
      setSelectedMonth(undefined);
    } else {
      setSelectedMonth(parseInt(value));
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(Number(amount));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const totalPages = salesData ? Math.ceil(salesData.total / salesData.limit) : 1;

  return (
    <div className="space-y-4">
      {/* Сводка */}
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{summary.totalSales}</div>
            <div className="text-xs text-muted-foreground">Всего продаж</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
            <div className="text-xs text-muted-foreground">На сумму</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
            <div className="text-xs text-muted-foreground">Оплачено</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalAmount - summary.totalPaid)}
            </div>
            <div className="text-xs text-muted-foreground">Долг</div>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-4">
        {years.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Год:</span>
              <div className="flex flex-wrap gap-2">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearClick(year)}
                    className={cn(
                      'text-sm border-b border-dashed transition-colors hover:text-primary',
                      selectedYear === year
                        ? 'text-primary border-primary font-medium'
                        : 'text-muted-foreground border-muted-foreground/50'
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
              {selectedYear && (
                <button
                  onClick={() => {
                    setSelectedYear(undefined);
                    setSelectedMonth(undefined);
                    setPage(1);
                  }}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {selectedYear && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Месяц:</span>
                <Select
                  value={selectedMonth?.toString() || 'all'}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Все месяцы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все месяцы</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* Поиск по номенклатуре */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номенклатуре..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 w-[220px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Таблица */}
      {!salesData?.data.length ? (
        <div className="text-center py-8 space-y-3">
          <div className="flex justify-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium">
            {debouncedSearch
              ? `Ничего не найдено по запросу "${debouncedSearch}"`
              : selectedYear || selectedMonth
                ? 'Нет продаж за выбранный период'
                : 'Нет архивных продаж'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 w-[130px]"
                    onClick={() => handleSort('saleDate')}
                  >
                    <div className="flex items-center">
                      Дата
                      <SortIcon field="saleDate" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('saleNumber')}
                  >
                    <div className="flex items-center">
                      Номер
                      <SortIcon field="saleNumber" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[350px]">Номенклатура</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Оплачено</TableHead>
                  <TableHead>Продавец</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.data.map((sale) => {
                  const isPaid = Number(sale.paidAmount) >= Number(sale.totalAmount);
                  return (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(sale.saleDate), 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">{sale.saleNumber}</TableCell>
                      <TableCell className="max-w-[350px]">
                        <span
                          className="block truncate text-sm text-muted-foreground"
                          title={sale.items.map((i) => i.itemName).join(', ')}
                        >
                          {sale.items.map((i) => i.itemName).join(', ') || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(sale.totalAmount))}</TableCell>
                      <TableCell>
                        <Badge variant={isPaid ? 'default' : 'secondary'}>
                          {formatCurrency(Number(sale.paidAmount))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {sale.sellerName || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Стр. {page} из {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Sheet с деталями продажи */}
      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent className="sm:max-w-lg">
          {selectedSale && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Продажа №{selectedSale.saleNumber}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  от {format(new Date(selectedSale.saleDate), 'dd.MM.yyyy HH:mm', { locale: ru })}
                </p>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Информация о продавце */}
                {selectedSale.sellerName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Продавец</p>
                    <p className="font-medium">{selectedSale.sellerName}</p>
                  </div>
                )}

                {/* Состав продажи */}
                <div>
                  <h4 className="font-medium mb-2">Состав продажи</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Наименование</TableHead>
                          <TableHead className="text-right">Кол.</TableHead>
                          <TableHead className="text-right">Цена</TableHead>
                          <TableHead className="text-right">Сумма</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.itemName}</TableCell>
                            <TableCell className="text-right text-sm">{Number(item.quantity)}</TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(Number(item.unitPrice))}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(item.totalPrice))}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-medium text-right">
                            Итого:
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(Number(selectedSale.totalAmount))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Оплаты */}
                <div>
                  <h4 className="font-medium mb-2">Оплаты</h4>
                  {selectedSale.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">(нет оплат)</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Дата</TableHead>
                            <TableHead>Способ</TableHead>
                            <TableHead className="text-right">Сумма</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSale.payments.map((payment, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm">
                                {format(new Date(payment.paymentDate), 'dd.MM.yyyy HH:mm', { locale: ru })}
                              </TableCell>
                              <TableCell className="text-sm">{payment.paymentMethod}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(Number(payment.amount))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Итог оплаты */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span className="text-sm">Оплачено:</span>
                  <div className="text-right">
                    <span className="font-bold">
                      {formatCurrency(Number(selectedSale.paidAmount))}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}/ {formatCurrency(Number(selectedSale.totalAmount))}
                    </span>
                  </div>
                </div>

                {Number(selectedSale.paidAmount) < Number(selectedSale.totalAmount) && (
                  <Badge variant="destructive" className="w-full justify-center py-2">
                    Долг: {formatCurrency(Number(selectedSale.totalAmount) - Number(selectedSale.paidAmount))}
                  </Badge>
                )}

                {Number(selectedSale.paidAmount) >= Number(selectedSale.totalAmount) && (
                  <Badge variant="default" className="w-full justify-center py-2 bg-green-600">
                    Оплачено полностью
                  </Badge>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
