'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import {
  Plus,
  FileHeart,
  ExternalLink,
  Trash2,
  Calendar,
  User,
  FileText,
  Loader2,
  Eye,
  Pencil,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { ViewCertificateDialog } from './components/view-certificate-dialog';
import { EditCertificateDialog } from './components/edit-certificate-dialog';
import {
  useMedicalCertificates,
  useDeleteMedicalCertificate,
  useAvailablePeriods,
} from '@/hooks/use-medical-certificates';
import { MedicalCertificate, MedicalCertificateFilter } from '@/lib/types/medical-certificates';

const MONTHS = [
  { value: 1, label: 'Янв' },
  { value: 2, label: 'Фев' },
  { value: 3, label: 'Мар' },
  { value: 4, label: 'Апр' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июн' },
  { value: 7, label: 'Июл' },
  { value: 8, label: 'Авг' },
  { value: 9, label: 'Сен' },
  { value: 10, label: 'Окт' },
  { value: 11, label: 'Ноя' },
  { value: 12, label: 'Дек' },
];

const currentYear = new Date().getFullYear();

export default function MedicalCertificatesPage() {
  const [filter, setFilter] = useState<MedicalCertificateFilter>({
    page: 1,
    limit: 20,
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<MedicalCertificate | null>(null);

  // Фильтры по месяцу и году
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Поиск клиента по ФИО
  const [searchQuery, setSearchQuery] = useState('');

  // Получение доступных периодов
  const { data: periodsData } = useAvailablePeriods();
  const availableYears = periodsData?.years || [];
  const availableMonthsByYear = periodsData?.months || {};

  // Обновление фильтров при изменении месяца/года
  const activeFilters = useMemo(() => {
    const f: MedicalCertificateFilter = {
      page: filter.page,
      limit: filter.limit,
    };

    if (selectedMonth && selectedYear) {
      // Начало и конец выбранного месяца
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      f.dateFrom = format(startDate, 'yyyy-MM-dd');
      f.dateTo = format(endDate, 'yyyy-MM-dd');
    }

    return f;
  }, [filter.page, filter.limit, selectedMonth, selectedYear]);

  const { data, isLoading, error } = useMedicalCertificates(activeFilters);
  const deleteMutation = useDeleteMedicalCertificate();

  // Фильтрация по ФИО на клиенте
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;

    const query = searchQuery.toLowerCase().trim();
    return data.items.filter((cert) => {
      const fullName = `${cert.client.lastName} ${cert.client.firstName} ${cert.client.middleName || ''}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [data?.items, searchQuery]);

  // Доступные месяцы для выбранного года
  const availableMonthsForYear = availableMonthsByYear[selectedYear] || [];

  const handleDelete = async () => {
    if (selectedCertificate) {
      await deleteMutation.mutateAsync(selectedCertificate.id);
      setDeleteDialogOpen(false);
      setSelectedCertificate(null);
    }
  };

  const getClientFullName = (certificate: MedicalCertificate) => {
    const { firstName, lastName, middleName } = certificate.client;
    return [lastName, firstName, middleName].filter(Boolean).join(' ');
  };

  return (
    <div className="flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Медицинские справки</h2>
          <p className="text-muted-foreground">
            Учет справок и автоматическое проставление статуса "Уважительная причина"
          </p>
        </div>
        <Button asChild>
          <Link href="/medical-certificates/new">
            <Plus className="h-4 w-4 mr-2" />
            Добавить справку
          </Link>
        </Button>
      </div>

      {/* Фильтры по году и месяцу */}
      <div className="flex flex-wrap items-center gap-3">
        {availableYears.length > 0 ? (
          availableYears.map((year) => (
            <button
              key={year}
              onClick={() => {
                setSelectedYear(year);
                // Если выбранный месяц недоступен для нового года, сбрасываем
                const monthsForYear = availableMonthsByYear[year] || [];
                if (selectedMonth && !monthsForYear.includes(selectedMonth)) {
                  setSelectedMonth(monthsForYear[0] || null);
                }
                setFilter((prev) => ({ ...prev, page: 1 }));
              }}
              className={cn(
                'text-sm border-b border-dashed transition-colors',
                selectedYear === year
                  ? 'text-foreground border-foreground font-medium'
                  : 'text-muted-foreground border-muted-foreground/50 hover:text-foreground hover:border-foreground'
              )}
            >
              {year}
            </button>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">Нет данных</span>
        )}

        {availableYears.length > 0 && availableMonthsForYear.length > 0 && (
          <>
            <span className="text-muted-foreground mx-2">|</span>

            <button
              onClick={() => {
                setSelectedMonth(null);
                setFilter((prev) => ({ ...prev, page: 1 }));
              }}
              className={cn(
                'text-sm border-b border-dashed transition-colors',
                selectedMonth === null
                  ? 'text-foreground border-foreground font-medium'
                  : 'text-muted-foreground border-muted-foreground/50 hover:text-foreground hover:border-foreground'
              )}
            >
              Все
            </button>
            {MONTHS.filter((month) => availableMonthsForYear.includes(month.value)).map((month) => (
              <button
                key={month.value}
                onClick={() => {
                  setSelectedMonth(month.value);
                  setFilter((prev) => ({ ...prev, page: 1 }));
                }}
                className={cn(
                  'text-sm border-b border-dashed transition-colors',
                  selectedMonth === month.value
                    ? 'text-foreground border-foreground font-medium'
                    : 'text-muted-foreground border-muted-foreground/50 hover:text-foreground hover:border-foreground'
                )}
              >
                {month.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список справок</CardTitle>
              <CardDescription>
                {searchQuery ? `${filteredItems.length} из ${data?.total || 0}` : `${data?.total || 0}`} справок найдено
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по ФИО..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Ошибка загрузки данных
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Период болезни</TableHead>
                    <TableHead>Файл</TableHead>
                    <TableHead>Занятий</TableHead>
                    <TableHead>Создано</TableHead>
                    <TableHead className="w-[130px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((certificate) => (
                    <TableRow
                      key={certificate.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedCertificate(certificate);
                        setViewDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {getClientFullName(certificate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(certificate.startDate), 'dd.MM.yyyy')} —{' '}
                          {format(new Date(certificate.endDate), 'dd.MM.yyyy')}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <a
                          href={certificate.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {certificate.fileName || 'Открыть'}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {certificate._count?.appliedSchedules || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(certificate.createdAt), 'dd.MM.yyyy HH:mm')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {certificate.createdBy.lastName} {certificate.createdBy.firstName}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Просмотр"
                            onClick={() => {
                              setSelectedCertificate(certificate);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Редактировать"
                            onClick={() => {
                              setSelectedCertificate(certificate);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Удалить"
                            onClick={() => {
                              setSelectedCertificate(certificate);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Показано {data.items.length} из {data.total}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filter.page === 1}
                      onClick={() => setFilter((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filter.page === data.totalPages}
                      onClick={() => setFilter((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileHeart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Справок пока нет</h3>
              <p className="text-muted-foreground mb-4">
                Добавьте первую медицинскую справку
              </p>
              <Button asChild>
                <Link href="/medical-certificates/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить справку
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <ViewCertificateDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        certificate={selectedCertificate}
        onEdit={() => {
          setViewDialogOpen(false);
          setEditDialogOpen(true);
        }}
      />

      {/* Edit Dialog */}
      <EditCertificateDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        certificate={selectedCertificate}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить справку?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Справка будет удалена, но статусы посещений останутся без изменений.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
