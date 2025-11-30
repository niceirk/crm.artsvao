'use client';

import { useState, useMemo } from 'react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, AlertTriangle, Check, Trash2, XCircle, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGroups } from '@/hooks/use-groups';
import { Group } from '@/lib/api/groups';
import { useStudios } from '@/hooks/use-studios';
import { useRooms } from '@/hooks/use-rooms';
import {
  useSchedulePreview,
  useBulkCreateRecurring,
  usePlannedSchedules,
  usePlannedMonthsStats,
} from '@/hooks/use-schedule-planner';
import { useBulkDeleteSchedules, useBulkUpdateSchedules } from '@/hooks/use-schedules';
import {
  PreviewScheduleItem,
  PreviewResult,
  WeeklyScheduleItem as ApiWeeklyScheduleItem,
  BulkScheduleItem,
} from '@/lib/api/schedules';
import { WeeklyScheduleItem, DAY_LABELS, DAYS_OF_WEEK, formatWeeklySchedule } from '@/lib/types/weekly-schedule';
import { toast } from '@/lib/utils/toast';
import { InlinePatternEditor } from '@/components/planner/inline-pattern-editor';

export default function SchedulePlannerPage() {
  const [activeTab, setActiveTab] = useState('planning');

  // Tab 1: Планирование
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [temporaryPatterns, setTemporaryPatterns] = useState<Map<string, WeeklyScheduleItem[]>>(new Map());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [autoEnrollClients, setAutoEnrollClients] = useState(true);

  // Tab 1: Фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [studioFilter, setStudioFilter] = useState<string>('');

  // Tab 2: Preview
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [excludedSchedules, setExcludedSchedules] = useState<Set<string>>(new Set());
  const [previewGroupFilter, setPreviewGroupFilter] = useState<string>('');

  // Tab 3: Запланированные занятия
  const [plannedYear, setPlannedYear] = useState(() => new Date().getFullYear());
  const [plannedMonth, setPlannedMonth] = useState(() => new Date().getMonth() + 1);
  const [plannedGroupFilter, setPlannedGroupFilter] = useState<string[]>([]);
  const [selectedPlannedSchedules, setSelectedPlannedSchedules] = useState<Set<string>>(new Set());
  const [plannedSearchQuery, setPlannedSearchQuery] = useState('');
  const [plannedStudioFilter, setPlannedStudioFilter] = useState<string>('');
  const [plannedSortField, setPlannedSortField] = useState<'date' | 'group' | 'teacher' | 'room'>('date');
  const [plannedSortDirection, setPlannedSortDirection] = useState<'asc' | 'desc'>('asc');

  // Data hooks
  const { data: groups, isLoading: groupsLoading } = useGroups({ status: 'ACTIVE', limit: 1000 });
  const { data: studios } = useStudios();
  const { data: rooms } = useRooms();

  const previewMutation = useSchedulePreview();
  const bulkCreateMutation = useBulkCreateRecurring();
  const bulkDeleteMutation = useBulkDeleteSchedules();
  const bulkUpdateMutation = useBulkUpdateSchedules();

  const { data: plannedSchedules, isLoading: plannedLoading } = usePlannedSchedules({
    year: plannedYear,
    month: plannedMonth,
    groupIds: plannedGroupFilter.length > 0 ? plannedGroupFilter : undefined,
  });

  const { data: monthsStats } = usePlannedMonthsStats();

  // Фильтрация групп
  const filteredGroups = useMemo(() => {
    if (!groups?.data) return [];
    return groups.data.filter((group: Group) => {
      const matchesSearch = !searchQuery ||
        group.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStudio = !studioFilter || group.studioId === studioFilter;
      return matchesSearch && matchesStudio;
    });
  }, [groups, searchQuery, studioFilter]);

  // Парсинг текущего месяца для навигации
  const currentMonthDate = useMemo(
    () => parse(selectedMonth, 'yyyy-MM', new Date()),
    [selectedMonth]
  );

  const handlePreviousMonth = () => {
    setSelectedMonth(format(subMonths(currentMonthDate, 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    setSelectedMonth(format(addMonths(currentMonthDate, 1), 'yyyy-MM'));
  };

  // Получить паттерн группы (временный или из группы)
  const getGroupPattern = (group: Group): WeeklyScheduleItem[] => {
    if (temporaryPatterns.has(group.id)) {
      return temporaryPatterns.get(group.id) || [];
    }
    return (group.weeklySchedule as WeeklyScheduleItem[]) || [];
  };

  // Установить временный паттерн
  const setGroupPattern = (groupId: string, pattern: WeeklyScheduleItem[]) => {
    setTemporaryPatterns((prev) => new Map(prev).set(groupId, pattern));
  };

  // Сбросить временный паттерн
  const resetGroupPattern = (groupId: string) => {
    setTemporaryPatterns((prev) => {
      const newMap = new Map(prev);
      newMap.delete(groupId);
      return newMap;
    });
  };

  // Переключить выбор группы
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Выбрать все группы
  const selectAllGroups = () => {
    setSelectedGroups(new Set(filteredGroups.map((g: Group) => g.id)));
  };

  // Снять выбор со всех
  const deselectAllGroups = () => {
    setSelectedGroups(new Set());
  };

  // Формирование preview
  const handleGeneratePreview = async () => {
    if (selectedGroups.size === 0) {
      toast.error('Выберите хотя бы одну группу');
      return;
    }

    const groupsData: {
      groupId: string;
      teacherId: string;
      roomId: string;
      weeklySchedule: ApiWeeklyScheduleItem[];
      duration: number;
    }[] = [];

    for (const groupId of Array.from(selectedGroups)) {
      const group = groups?.data?.find((g: Group) => g.id === groupId);
      if (!group) continue;

      const pattern = getGroupPattern(group);
      if (pattern.length === 0) {
        toast.error(`Группа "${group.name}" не имеет расписания`);
        return;
      }

      if (!group.roomId) {
        toast.error(`Группа "${group.name}" не имеет помещения по умолчанию`);
        return;
      }

      groupsData.push({
        groupId: group.id,
        teacherId: group.teacherId,
        roomId: group.roomId,
        weeklySchedule: pattern.map((p) => ({
          day: p.day,
          startTime: p.startTime,
          roomId: p.roomId,
        })),
        duration: group.duration || 60,
      });
    }

    try {
      const result = await previewMutation.mutateAsync({
        groups: groupsData,
        month: selectedMonth,
      });
      setPreviewData(result);
      setExcludedSchedules(new Set());
      setActiveTab('preview');
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  // Создание занятий из preview
  const handleCreateSchedules = async () => {
    if (!previewData) return;

    const schedulesToCreate: BulkScheduleItem[] = previewData.schedules
      .filter((s) => !excludedSchedules.has(s.tempId))
      .map((s) => ({
        groupId: s.groupId,
        teacherId: s.teacherId,
        roomId: s.roomId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      }));

    if (schedulesToCreate.length === 0) {
      toast.error('Нет занятий для создания');
      return;
    }

    try {
      await bulkCreateMutation.mutateAsync({
        schedules: schedulesToCreate,
        autoEnrollClients,
      });
      setPreviewData(null);
      setSelectedGroups(new Set());
      setTemporaryPatterns(new Map());
      setActiveTab('planned');
    } catch (error) {
      console.error('Create error:', error);
    }
  };

  // Фильтрация preview по группе + сортировка (конфликты сверху)
  const filteredPreviewSchedules = useMemo(() => {
    if (!previewData) return [];
    const filtered = previewGroupFilter
      ? previewData.schedules.filter((s) => s.groupId === previewGroupFilter)
      : previewData.schedules;

    // Сортировка: сначала занятия с конфликтами, потом по дате
    return [...filtered].sort((a, b) => {
      // Приоритет конфликтам
      if (a.hasConflict && !b.hasConflict) return -1;
      if (!a.hasConflict && b.hasConflict) return 1;
      // Внутри групп - по дате
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [previewData, previewGroupFilter]);

  // Функция переключения сортировки
  const togglePlannedSort = (field: 'date' | 'group' | 'teacher' | 'room') => {
    if (plannedSortField === field) {
      setPlannedSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPlannedSortField(field);
      setPlannedSortDirection('asc');
    }
  };

  // Иконка сортировки
  const getSortIcon = (field: 'date' | 'group' | 'teacher' | 'room') => {
    if (plannedSortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return plannedSortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Фильтрация и сортировка запланированных занятий
  const filteredPlannedSchedules = useMemo(() => {
    if (!plannedSchedules) return [];

    const filtered = plannedSchedules.filter((schedule) => {
      const matchesSearch = !plannedSearchQuery ||
        schedule.group?.name?.toLowerCase().includes(plannedSearchQuery.toLowerCase());
      const matchesStudio = !plannedStudioFilter ||
        schedule.group?.studio?.id === plannedStudioFilter;
      return matchesSearch && matchesStudio;
    });

    // Сортировка
    return filtered.sort((a, b) => {
      let compareResult = 0;

      switch (plannedSortField) {
        case 'date':
          compareResult = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'group':
          compareResult = (a.group?.name || '').localeCompare(b.group?.name || '', 'ru');
          break;
        case 'teacher':
          const teacherA = a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : '';
          const teacherB = b.teacher ? `${b.teacher.firstName} ${b.teacher.lastName}` : '';
          compareResult = teacherA.localeCompare(teacherB, 'ru');
          break;
        case 'room':
          compareResult = (a.room?.name || '').localeCompare(b.room?.name || '', 'ru');
          break;
      }

      return plannedSortDirection === 'asc' ? compareResult : -compareResult;
    });
  }, [plannedSchedules, plannedSearchQuery, plannedStudioFilter, plannedSortField, plannedSortDirection]);

  // Массовое удаление запланированных
  const handleDeletePlannedSchedules = async () => {
    if (selectedPlannedSchedules.size === 0) return;

    try {
      await bulkDeleteMutation.mutateAsync({
        scheduleIds: Array.from(selectedPlannedSchedules),
      });
      setSelectedPlannedSchedules(new Set());
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Массовая отмена запланированных
  const handleCancelPlannedSchedules = async () => {
    if (selectedPlannedSchedules.size === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        scheduleIds: Array.from(selectedPlannedSchedules),
        status: 'CANCELLED',
      });
      setSelectedPlannedSchedules(new Set());
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  // Навигация по месяцам в Tab 3
  const goToPreviousMonth = () => {
    if (plannedMonth === 1) {
      setPlannedYear((y) => y - 1);
      setPlannedMonth(12);
    } else {
      setPlannedMonth((m) => m - 1);
    }
    setSelectedPlannedSchedules(new Set());
  };

  const goToNextMonth = () => {
    if (plannedMonth === 12) {
      setPlannedYear((y) => y + 1);
      setPlannedMonth(1);
    } else {
      setPlannedMonth((m) => m + 1);
    }
    setSelectedPlannedSchedules(new Set());
  };

  // Форматирование даты (парсит YYYY-MM-DD корректно без смещения таймзоны)
  const formatDate = (dateStr: string) => {
    // Разбираем дату вручную, чтобы избежать проблем с часовыми поясами
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Форматирование времени (обрабатывает ISO DateTime и HH:mm)
  const formatTime = (timeStr: string | Date): string => {
    if (!timeStr) return '--:--';
    // Если это Date или ISO строка
    if (timeStr instanceof Date || (typeof timeStr === 'string' && timeStr.includes('T'))) {
      const date = new Date(timeStr);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    // Если это уже HH:mm или HH:mm:ss формат
    return timeStr.slice(0, 5);
  };

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h1 className="text-2xl font-bold">Планировщик расписания</h1>
        <p className="text-muted-foreground">
          Быстрое создание расписания для нескольких групп
        </p>
      </div>

      {/* Навигация в виде текстовых ссылок */}
      <nav className="flex items-center gap-6 text-sm">
        <button
          onClick={() => setActiveTab('planning')}
          className={cn(
            'pb-1 border-b border-dashed transition-colors',
            activeTab === 'planning'
              ? 'text-foreground border-foreground font-medium'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground'
          )}
        >
          Планирование
        </button>
        <button
          onClick={() => previewData && setActiveTab('preview')}
          disabled={!previewData}
          className={cn(
            'pb-1 border-b border-dashed transition-colors',
            activeTab === 'preview'
              ? 'text-foreground border-foreground font-medium'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground',
            !previewData && 'opacity-50 cursor-not-allowed hover:text-muted-foreground hover:border-transparent'
          )}
        >
          Предпросмотр{previewData && ` (${previewData.summary.total})`}
        </button>
        <button
          onClick={() => setActiveTab('planned')}
          className={cn(
            'pb-1 border-b border-dashed transition-colors',
            activeTab === 'planned'
              ? 'text-foreground border-foreground font-medium'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground'
          )}
        >
          Запланированные
        </button>
      </nav>

      {/* TAB 1: Планирование */}
      {activeTab === 'planning' && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* Фильтры и действия на одной строке */}
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Поиск группы..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Select value={studioFilter || 'all'} onValueChange={(v) => setStudioFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Все студии" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все студии</SelectItem>
                    {studios?.map((studio) => (
                      <SelectItem key={studio.id} value={studio.id}>
                        {studio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="w-[130px] text-center font-medium text-sm capitalize">
                    {format(currentMonthDate, 'LLLL yyyy', { locale: ru })}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <Checkbox
                    id="autoEnroll"
                    checked={autoEnrollClients}
                    onCheckedChange={(checked) => setAutoEnrollClients(checked as boolean)}
                  />
                  <Label htmlFor="autoEnroll" className="text-sm cursor-pointer whitespace-nowrap">
                    Записать участников
                  </Label>
                </div>
                <Button
                  onClick={handleGeneratePreview}
                  disabled={selectedGroups.size === 0 || previewMutation.isPending}
                  className="whitespace-nowrap"
                >
                  {previewMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Сформировать{selectedGroups.size > 0 ? ` (${selectedGroups.size})` : ''}
                </Button>
              </div>

              {/* Действия с выбором */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={selectAllGroups}>
                  Выбрать все
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllGroups}>
                  Снять выбор
                </Button>
              </div>

              {/* Таблица групп */}
              {groupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              filteredGroups.length > 0 &&
                              filteredGroups.every((g: Group) => selectedGroups.has(g.id))
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                selectAllGroups();
                              } else {
                                deselectAllGroups();
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Группа</TableHead>
                        <TableHead>Преподаватель</TableHead>
                        <TableHead>Расписание</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Нет групп для отображения
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGroups.map((group: Group) => {
                          const pattern = getGroupPattern(group);
                          const hasTemporaryPattern = temporaryPatterns.has(group.id);
                          const isSelected = selectedGroups.has(group.id);

                          return (
                            <TableRow
                              key={group.id}
                              className={isSelected ? 'bg-muted/50' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleGroupSelection(group.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{group.name}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {group.teacher
                                  ? `${group.teacher.firstName} ${group.teacher.lastName}`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <InlinePatternEditor
                                  value={pattern}
                                  originalValue={(group.weeklySchedule as WeeklyScheduleItem[]) || []}
                                  onChange={(newPattern) => setGroupPattern(group.id, newPattern)}
                                  duration={group.duration || 60}
                                  rooms={rooms || []}
                                  isModified={hasTemporaryPattern}
                                />
                              </TableCell>
                              <TableCell>
                                {hasTemporaryPattern && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resetGroupPattern(group.id)}
                                    title="Сбросить изменения"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
      )}

      {/* TAB 2: Предпросмотр */}
      {activeTab === 'preview' && previewData && (
            <Card className="flex flex-col flex-1 min-h-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Предпросмотр занятий</CardTitle>
                    <CardDescription>
                      Всего: {previewData.summary.total}, с конфликтами:{' '}
                      <span className="text-orange-500 font-medium">
                        {previewData.summary.withConflicts}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-48">
                      <Select value={previewGroupFilter || 'all'} onValueChange={(v) => setPreviewGroupFilter(v === 'all' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все группы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все группы</SelectItem>
                          {Object.entries(previewData.summary.byGroup).map(([groupId, stats]) => (
                            <SelectItem key={groupId} value={groupId}>
                              {stats.groupName} ({stats.total})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Исключаем все занятия с конфликтами
                        const conflictIds = new Set(
                          filteredPreviewSchedules
                            .filter((s) => s.hasConflict)
                            .map((s) => s.tempId)
                        );
                        setExcludedSchedules(conflictIds);
                      }}
                      disabled={previewData.summary.withConflicts === 0}
                    >
                      Выбрать без конфликтов
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('planning')}>
                      Назад к планированию
                    </Button>
                    <Button
                      onClick={handleCreateSchedules}
                      disabled={bulkCreateMutation.isPending}
                    >
                      {bulkCreateMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Создать занятия ({previewData.summary.total - excludedSchedules.size})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 flex flex-col">
                <div className="border rounded-lg flex-1 min-h-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={excludedSchedules.size === 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setExcludedSchedules(new Set());
                              } else {
                                setExcludedSchedules(
                                  new Set(filteredPreviewSchedules.map((s) => s.tempId))
                                );
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Время</TableHead>
                        <TableHead>Группа</TableHead>
                        <TableHead>Помещение</TableHead>
                        <TableHead>Преподаватель</TableHead>
                        <TableHead className="w-20">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPreviewSchedules.map((schedule) => {
                        const isExcluded = excludedSchedules.has(schedule.tempId);
                        return (
                          <TableRow
                            key={schedule.tempId}
                            className={
                              isExcluded
                                ? 'opacity-50 bg-muted/30'
                                : schedule.hasConflict
                                ? 'bg-orange-50 dark:bg-orange-950/20'
                                : ''
                            }
                          >
                            <TableCell>
                              <Checkbox
                                checked={!isExcluded}
                                onCheckedChange={(checked) => {
                                  setExcludedSchedules((prev) => {
                                    const newSet = new Set(prev);
                                    if (checked) {
                                      newSet.delete(schedule.tempId);
                                    } else {
                                      newSet.add(schedule.tempId);
                                    }
                                    return newSet;
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>{formatDate(schedule.date)}</TableCell>
                            <TableCell>
                              {schedule.startTime}-{schedule.endTime}
                            </TableCell>
                            <TableCell className="font-medium">{schedule.groupName}</TableCell>
                            <TableCell>{schedule.roomName}</TableCell>
                            <TableCell>{schedule.teacherName}</TableCell>
                            <TableCell>
                              {schedule.hasConflict ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-orange-500 border-orange-500">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Конфликт
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <ul className="text-sm space-y-1">
                                        {schedule.conflicts.map((c, i) => (
                                          <li key={i}>{c.reason}</li>
                                        ))}
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge variant="outline" className="text-green-500 border-green-500">
                                  <Check className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
      )}

      {/* TAB 3: Запланированные занятия */}
      {activeTab === 'planned' && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* Фильтры и действия */}
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Поиск группы..."
                  value={plannedSearchQuery}
                  onChange={(e) => setPlannedSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Select value={plannedStudioFilter || 'all'} onValueChange={(v) => setPlannedStudioFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Все студии" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все студии</SelectItem>
                    {studios?.map((studio) => (
                      <SelectItem key={studio.id} value={studio.id}>
                        {studio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={goToPreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="w-[130px] text-center font-medium text-sm capitalize">
                    {formatMonthYear(plannedYear, plannedMonth)}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={goToNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {selectedPlannedSchedules.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelPlannedSchedules}
                      disabled={bulkUpdateMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Отменить ({selectedPlannedSchedules.size})
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeletePlannedSchedules}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить ({selectedPlannedSchedules.size})
                    </Button>
                  </>
                )}
              </div>

              {/* Быстрые ссылки на месяцы */}
              {monthsStats && monthsStats.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                  {monthsStats.map((stat) => {
                    const [y, m] = stat.yearMonth.split('-').map(Number);
                    const isActive = y === plannedYear && m === plannedMonth;
                    return (
                      <button
                        key={stat.yearMonth}
                        onClick={() => {
                          setPlannedYear(y);
                          setPlannedMonth(m);
                          setSelectedPlannedSchedules(new Set());
                        }}
                        className={cn(
                          'underline-offset-4 transition-colors decoration-1 decoration-gray-400',
                          isActive
                            ? 'text-foreground font-medium underline decoration-dashed'
                            : 'text-muted-foreground hover:text-foreground hover:underline hover:decoration-dashed'
                        )}
                      >
                        {new Date(y, m - 1).toLocaleDateString('ru-RU', {
                          month: 'short',
                          year: '2-digit',
                        })}{' '}
                        ({stat.count} занятий)
                      </button>
                    );
                  })}
                </div>
              )}

              {plannedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPlannedSchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {plannedSchedules && plannedSchedules.length > 0
                    ? 'Нет занятий по выбранным фильтрам'
                    : 'Нет запланированных занятий в этом месяце'}
                </div>
              ) : (
                <div className="border rounded-lg max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              filteredPlannedSchedules.length > 0 &&
                              filteredPlannedSchedules.every((s) => selectedPlannedSchedules.has(s.id))
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPlannedSchedules(
                                  new Set(filteredPlannedSchedules.map((s) => s.id))
                                );
                              } else {
                                setSelectedPlannedSchedules(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => togglePlannedSort('date')}
                          >
                            Дата
                            {getSortIcon('date')}
                          </button>
                        </TableHead>
                        <TableHead>Время</TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => togglePlannedSort('group')}
                          >
                            Группа
                            {getSortIcon('group')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => togglePlannedSort('room')}
                          >
                            Помещение
                            {getSortIcon('room')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => togglePlannedSort('teacher')}
                          >
                            Преподаватель
                            {getSortIcon('teacher')}
                          </button>
                        </TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlannedSchedules.map((schedule) => (
                        <TableRow
                          key={schedule.id}
                          className={
                            selectedPlannedSchedules.has(schedule.id) ? 'bg-muted/50' : ''
                          }
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedPlannedSchedules.has(schedule.id)}
                              onCheckedChange={(checked) => {
                                setSelectedPlannedSchedules((prev) => {
                                  const newSet = new Set(prev);
                                  if (checked) {
                                    newSet.add(schedule.id);
                                  } else {
                                    newSet.delete(schedule.id);
                                  }
                                  return newSet;
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>{formatDate(schedule.date)}</TableCell>
                          <TableCell>
                            {formatTime(schedule.startTime)}-{formatTime(schedule.endTime)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {schedule.group?.name || '-'}
                          </TableCell>
                          <TableCell>{schedule.room?.name || '-'}</TableCell>
                          <TableCell>
                            {schedule.teacher
                              ? `${schedule.teacher.firstName} ${schedule.teacher.lastName}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={schedule.status === 'CANCELLED' ? 'destructive' : 'outline'}
                            >
                              {schedule.status === 'PLANNED' && 'Запланировано'}
                              {schedule.status === 'CANCELLED' && 'Отменено'}
                              {schedule.status === 'COMPLETED' && 'Завершено'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
      )}
    </div>
  );
}
