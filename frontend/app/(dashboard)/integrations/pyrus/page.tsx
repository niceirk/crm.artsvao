'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCw, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  fetchPyrusTasks,
  importPyrusTasks,
  PyrusTaskPreview,
  ImportResult,
  testPyrusConnection,
  syncRoomsFromPyrus,
} from '@/lib/api/pyrus';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PyrusImportPage() {
  const [tasks, setTasks] = useState<PyrusTaskPreview[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncingRooms, setSyncingRooms] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [roomsSyncResult, setRoomsSyncResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

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
      setSelectedTasks(new Set(tasks.map((task) => task.id)));
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
        selectedTasks.size > 0 ? Array.from(selectedTasks) : undefined,
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

  const handleSyncRooms = async () => {
    setSyncingRooms(true);
    setRoomsSyncResult(null);
    setError(null);

    try {
      const result = await syncRoomsFromPyrus();
      setRoomsSyncResult(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось синхронизировать помещения');
    } finally {
      setSyncingRooms(false);
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

      {/* Результаты синхронизации помещений */}
      {roomsSyncResult && (
        <Alert className="border-blue-500">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Синхронизация помещений завершена</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <div>
                Создано новых помещений: <strong>{roomsSyncResult.created}</strong>
              </div>
              <div>
                Обнаружено существующих: <strong>{roomsSyncResult.updated}</strong>
              </div>
              {roomsSyncResult.errors.length > 0 && (
                <div className="mt-3">
                  <div className="font-semibold mb-2">Ошибки:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {roomsSyncResult.errors.map((err, idx) => (
                      <li key={idx} className="text-sm">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
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

      {/* Панель управления */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Задачи из Pyrus</CardTitle>
              <CardDescription>
                {tasks.length > 0
                  ? `Найдено задач: ${tasks.length}`
                  : 'Нажмите "Обновить" для загрузки задач'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSyncRooms} disabled={syncingRooms || !connectionStatus?.success} variant="secondary">
                {syncingRooms ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Синхронизировать помещения
              </Button>
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
                disabled={importing || loading || !connectionStatus?.success}
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {selectedTasks.size > 0
                  ? `Импортировать выбранные (${selectedTasks.size})`
                  : 'Импортировать все'}
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
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTasks.size === tasks.length && tasks.length > 0}
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
                  {tasks.map((task) => {
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
