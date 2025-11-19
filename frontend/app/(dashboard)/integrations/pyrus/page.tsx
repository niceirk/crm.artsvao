'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Download, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import {
  fetchPyrusTasks,
  importPyrusTasks,
  PyrusTaskPreview,
  ImportResult,
  testPyrusConnection,
} from '@/lib/api/pyrus';
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

export default function PyrusImportPage() {
  const [tasks, setTasks] = useState<PyrusTaskPreview[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Фильтры
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  // Показать индикатор загрузки при изменении фильтров
  useEffect(() => {
    if (filterMonth || filterYear || filterDateFrom || filterDateTo) {
      setFiltering(true);
      const timer = setTimeout(() => {
        setFiltering(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [filterMonth, filterYear, filterDateFrom, filterDateTo]);

  const checkConnection = async () => {
    try {
      const status = await testPyrusConnection();
      setConnectionStatus(status);
      if (status.success) {
        loadTasks();
      }
    } catch (err: any) {
      setConnectionStatus({
        success: false,
        message: err.response?.data?.message || 'Ошибка подключения к Pyrus',
      });
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPyrusTasks();
      setTasks(data);
      setSelectedTasks(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить задачи из Pyrus');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(filteredTasks.map((task) => task.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleSelectTask = (taskId: number, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const result = await importPyrusTasks(
        selectedTasks.size > 0 ? Array.from(selectedTasks) : filteredTasks.map(t => t.id),
      );
      setImportResult(result);

      // Обновляем список задач после импорта
      if (result.imported > 0 || result.updated > 0) {
        await loadTasks();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось импортировать события');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Получить значение поля из задачи
  const getFieldValue = (task: PyrusTaskPreview, fieldId: number) => {
    const field = task.fields.find((f) => f.id === fieldId);
    return field?.value || '';
  };

  // Получить название мероприятия (первое текстовое поле или task.text)
  const getEventName = (task: PyrusTaskPreview) => {
    // Попробуем найти название в полях
    const nameField = getFieldValue(task, 1) || getFieldValue(task, 2) || task.text;
    return nameField || `Задача #${task.id}`;
  };

  // Получить дату мероприятия если есть
  const getEventDate = (task: PyrusTaskPreview) => {
    for (const field of task.fields) {
      if (field.type === 'date' && field.value) {
        return new Date(field.value).toLocaleDateString('ru-RU');
      }
    }
    return null;
  };

  // Получить дату мероприятия как Date объект
  const getEventDateObject = (task: PyrusTaskPreview): Date | null => {
    for (const field of task.fields) {
      if (field.type === 'date' && field.value) {
        return new Date(field.value);
      }
    }
    return null;
  };

  // Фильтрация задач
  const filteredTasks = useMemo(() => {
    console.log('=== Фильтрация задач Pyrus ===');
    console.log(`Всего задач: ${tasks.length}`);
    console.log(`Активные фильтры:`, { filterMonth, filterYear, filterDateFrom, filterDateTo });

    const result = tasks.filter((task) => {
      const eventDate = getEventDateObject(task);

      // Если нет даты мероприятия, показываем только если нет активных фильтров
      if (!eventDate) {
        const show = !filterMonth && !filterYear && !filterDateFrom && !filterDateTo;
        if (!show) {
          console.log(`Задача ${task.id}: НЕТ ДАТЫ - СКРЫТА (есть активные фильтры)`);
        }
        return show;
      }

      // Фильтр по месяцу и году
      if (filterMonth || filterYear) {
        const taskMonth = eventDate.getMonth() + 1; // 1-12
        const taskYear = eventDate.getFullYear();

        if (filterMonth && taskMonth !== parseInt(filterMonth)) {
          console.log(`Задача ${task.id}: дата ${eventDate.toISOString().split('T')[0]} - СКРЫТА (месяц ${taskMonth} != ${filterMonth})`);
          return false;
        }
        if (filterYear && taskYear !== parseInt(filterYear)) {
          console.log(`Задача ${task.id}: дата ${eventDate.toISOString().split('T')[0]} - СКРЫТА (год ${taskYear} != ${filterYear})`);
          return false;
        }
      }

      // Фильтр по диапазону дат
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (eventDate < fromDate) {
          console.log(`Задача ${task.id}: дата ${eventDate.toISOString().split('T')[0]} - СКРЫТА (раньше чем ${filterDateFrom})`);
          return false;
        }
      }

      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (eventDate > toDate) {
          console.log(`Задача ${task.id}: дата ${eventDate.toISOString().split('T')[0]} - СКРЫТА (позже чем ${filterDateTo})`);
          return false;
        }
      }

      return true;
    });

    console.log(`Отфильтровано задач: ${result.length}`);
    console.log('=== Конец фильтрации ===');
    return result;
  }, [tasks, filterMonth, filterYear, filterDateFrom, filterDateTo]);

  // Очистить все фильтры
  const clearFilters = () => {
    setFilterMonth('');
    setFilterYear('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Проверка наличия активных фильтров
  const hasActiveFilters = filterMonth || filterYear || filterDateFrom || filterDateTo;

  // Генерация списка годов (текущий год ± 5 лет)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Импорт мероприятий из Pyrus</h1>
        <p className="text-muted-foreground mt-2">
          Синхронизация мероприятий из CRM системы Pyrus
        </p>
      </div>

      {/* Статус подключения */}
      {connectionStatus && (
        <Alert variant={connectionStatus.success ? 'default' : 'destructive'}>
          {connectionStatus.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {connectionStatus.success ? 'Подключение установлено' : 'Ошибка подключения'}
          </AlertTitle>
          <AlertDescription>{connectionStatus.message}</AlertDescription>
        </Alert>
      )}

      {/* Результаты импорта */}
      {importResult && (
        <Alert
          variant={importResult.errors.length > 0 ? 'destructive' : 'default'}
          className="border-green-500"
        >
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Импорт завершен</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <div>
                Импортировано новых: <strong>{importResult.imported}</strong>
              </div>
              <div>
                Обновлено существующих: <strong>{importResult.updated}</strong>
              </div>
              {importResult.skipped > 0 && (
                <div>
                  Пропущено: <strong>{importResult.skipped}</strong>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="mt-3">
                  <div className="font-semibold mb-2">Ошибки:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx} className="text-sm">
                        Задача #{err.taskId}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Ошибки */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры по дате мероприятий</CardTitle>
          <CardDescription>
            Укажите период или месяц для фильтрации мероприятий
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Фильтр по году */}
            <div className="space-y-2">
              <Label htmlFor="filter-year">Год</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger id="filter-year">
                  <SelectValue placeholder="Выберите год" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Фильтр по месяцу */}
            <div className="space-y-2">
              <Label htmlFor="filter-month">Месяц</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger id="filter-month">
                  <SelectValue placeholder="Выберите месяц" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Январь</SelectItem>
                  <SelectItem value="2">Февраль</SelectItem>
                  <SelectItem value="3">Март</SelectItem>
                  <SelectItem value="4">Апрель</SelectItem>
                  <SelectItem value="5">Май</SelectItem>
                  <SelectItem value="6">Июнь</SelectItem>
                  <SelectItem value="7">Июль</SelectItem>
                  <SelectItem value="8">Август</SelectItem>
                  <SelectItem value="9">Сентябрь</SelectItem>
                  <SelectItem value="10">Октябрь</SelectItem>
                  <SelectItem value="11">Ноябрь</SelectItem>
                  <SelectItem value="12">Декабрь</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Фильтр по дате от */}
            <div className="space-y-2">
              <Label htmlFor="filter-date-from">Дата от</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>

            {/* Фильтр по дате до */}
            <div className="space-y-2">
              <Label htmlFor="filter-date-to">Дата до</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="gap-1"
                disabled={filtering}
              >
                <X className="h-3 w-3" />
                Очистить фильтры
              </Button>
              {filtering ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Применение фильтров...</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Найдено мероприятий: {filteredTasks.length} из {tasks.length}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Панель управления */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Задачи из Pyrus</CardTitle>
              <CardDescription>
                {filteredTasks.length > 0
                  ? `Показано задач: ${filteredTasks.length}${tasks.length !== filteredTasks.length ? ` из ${tasks.length}` : ''}`
                  : tasks.length > 0
                  ? 'Нет задач, соответствующих фильтрам'
                  : 'Нажмите "Обновить" для загрузки задач'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadTasks} disabled={loading || importing} variant="outline">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Обновить задачи
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || loading || !connectionStatus?.success || filteredTasks.length === 0}
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {selectedTasks.size > 0
                  ? `Импортировать выбранные (${selectedTasks.size})`
                  : `Импортировать все (${filteredTasks.length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {connectionStatus?.success
                ? 'Нет доступных задач для импорта'
                : 'Проверьте настройки подключения к Pyrus'}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Нет мероприятий, соответствующих выбранным фильтрам
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Название мероприятия</TableHead>
                    <TableHead>Дата мероприятия</TableHead>
                    <TableHead>Создано</TableHead>
                    <TableHead>Изменено</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const eventName = getEventName(task);
                    const eventDate = getEventDate(task);

                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={(checked) =>
                              handleSelectTask(task.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{task.id}</TableCell>
                        <TableCell className="font-medium max-w-md">
                          <div className="truncate" title={eventName}>
                            {eventName}
                          </div>
                          {task.fields.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {task.fields.length} полей данных
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {eventDate ? (
                            <Badge variant="secondary">{eventDate}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Не указана</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(task.createDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(task.lastModifiedDate)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Инструкция */}
      <Card>
        <CardHeader>
          <CardTitle>Как использовать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1. Проверьте подключение</h4>
            <p className="text-muted-foreground">
              Убедитесь, что статус подключения к Pyrus API показывает успех.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Загрузите задачи</h4>
            <p className="text-muted-foreground">
              Нажмите кнопку "Обновить" для получения актуального списка задач из формы Pyrus.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Выберите задачи для импорта</h4>
            <p className="text-muted-foreground">
              Отметьте нужные задачи в таблице или оставьте все невыбранными для импорта всех задач.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">4. Запустите импорт</h4>
            <p className="text-muted-foreground">
              Нажмите "Импортировать выбранные" или "Импортировать все". Существующие мероприятия будут обновлены.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
