'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, Check, X, AlertTriangle, FileX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { timesheetsApi } from '@/lib/api/timesheets';
import type {
  ImportAttendanceResult,
  ImportAttendanceRowResult,
} from '@/lib/types/timesheets';

interface ImportAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName?: string;
  onSuccess?: () => void;
}

type FilterStatus = 'all' | 'imported' | 'skipped' | 'errors';

export function ImportAttendanceDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onSuccess,
}: ImportAttendanceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportAttendanceResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsLoading(true);
      setResult(null);

      try {
        const importResult = await timesheetsApi.importAttendance(groupId, file);
        setResult(importResult);

        if (importResult.summary.imported > 0) {
          toast.success(
            `Импортировано ${importResult.summary.imported} записей`,
          );
          onSuccess?.();
        } else if (importResult.summary.total === 0) {
          toast.warning('Файл не содержит данных для импорта');
        } else {
          toast.warning('Не удалось импортировать записи');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Ошибка при импорте посещаемости',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [groupId, onSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  const handleClose = () => {
    setResult(null);
    setFilterStatus('all');
    onOpenChange(false);
  };

  // Приоритет сортировки: ошибки первыми, потом пропущенные, потом успешные
  const getStatusPriority = (status: ImportAttendanceRowResult['status']): number => {
    switch (status) {
      case 'client_not_found':
      case 'schedule_not_found':
        return 0; // Ошибки первыми
      case 'skipped':
        return 1; // Пропущенные вторыми
      case 'imported':
        return 2; // Успешные последними
      default:
        return 3;
    }
  };

  // Фильтрация и сортировка результатов
  const filteredResults = (result?.results.filter((r) => {
    switch (filterStatus) {
      case 'imported':
        return r.status === 'imported';
      case 'skipped':
        return r.status === 'skipped';
      case 'errors':
        return r.status === 'client_not_found' || r.status === 'schedule_not_found';
      default:
        return true;
    }
  }) ?? []).sort((a, b) => getStatusPriority(a.status) - getStatusPriority(b.status));

  const getStatusIcon = (status: ImportAttendanceRowResult['status']) => {
    switch (status) {
      case 'imported':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'client_not_found':
      case 'schedule_not_found':
        return <X className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: ImportAttendanceRowResult['status']) => {
    switch (status) {
      case 'imported':
        return <Badge variant="default" className="bg-green-600">Импортировано</Badge>;
      case 'skipped':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Пропущено</Badge>;
      case 'client_not_found':
        return <Badge variant="destructive">Клиент не найден</Badge>;
      case 'schedule_not_found':
        return <Badge variant="destructive">Занятие не найдено</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Импорт посещаемости</DialogTitle>
          <DialogDescription>
            {groupName
              ? `Группа: ${groupName}`
              : 'Загрузите Excel файл с отчетом о посещениях'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4 py-4">
          {/* Зона загрузки файла */}
          {!result && (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50',
                isLoading && 'opacity-50 cursor-not-allowed',
              )}
            >
              <input {...getInputProps()} />
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Загрузка и обработка файла...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm">
                    {isDragActive
                      ? 'Отпустите файл для загрузки'
                      : 'Перетащите Excel файл или нажмите для выбора'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Формат: ОтчетГруппа.xlsx
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Результаты импорта */}
          {result && (
            <>
              {/* Сводка */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <div className="text-2xl font-bold">{result.summary.total}</div>
                  <div className="text-xs text-muted-foreground">Всего</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.summary.imported}
                  </div>
                  <div className="text-xs text-green-600">Импортировано</div>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {result.summary.skipped}
                  </div>
                  <div className="text-xs text-yellow-600">Пропущено</div>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {result.summary.clientNotFound + result.summary.scheduleNotFound}
                  </div>
                  <div className="text-xs text-red-600">Ошибки</div>
                </div>
              </div>

              {/* Фильтр */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Показать:</span>
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as FilterStatus)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все ({result.results.length})</SelectItem>
                    <SelectItem value="imported">
                      Импортировано ({result.summary.imported})
                    </SelectItem>
                    <SelectItem value="skipped">
                      Пропущено ({result.summary.skipped})
                    </SelectItem>
                    <SelectItem value="errors">
                      Ошибки ({result.summary.clientNotFound + result.summary.scheduleNotFound})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Таблица результатов */}
              <ScrollArea className="h-[300px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>ФИО</TableHead>
                      <TableHead>Результат</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <FileX className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground">Нет записей</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredResults.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground text-sm">
                            {row.row}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.dateTime}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm" title={row.fio}>
                            {row.fio}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(row.status)}
                              <span className="text-sm text-muted-foreground" title={row.message}>
                                {row.message.length > 30
                                  ? row.message.slice(0, 30) + '...'
                                  : row.message}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setFilterStatus('all');
                }}
              >
                Загрузить другой файл
              </Button>
              <Button onClick={handleClose}>Закрыть</Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Отмена
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
