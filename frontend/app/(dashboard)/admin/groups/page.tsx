'use client';

import { useState, useMemo } from 'react';
import { Plus, Filter, ChevronDown, CalendarDays, CalendarX } from 'lucide-react';
import Link from 'next/link';
import { addMonths, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useGroups } from '@/hooks/use-groups';
import { GroupsTable } from './groups-table';
import { GroupDialog } from './group-dialog';
import { GroupFilters } from './group-filters';
import { GroupFilters as FilterType } from '@/lib/api/groups';

export default function GroupsPage() {
  const [filters, setFilters] = useState<FilterType>({ limit: 1000 });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [noScheduleMonth, setNoScheduleMonth] = useState<string | null>(null);

  const { data: response, isLoading } = useGroups(filters);

  const allGroups = response?.data || [];

  // Генерируем список месяцев (текущий + 5 следующих)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = addMonths(now, i);
      const yearMonth = format(date, 'yyyy-MM');
      const label = format(date, 'LLLL yyyy', { locale: ru });
      months.push({ value: yearMonth, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  }, []);

  // Фильтрация групп по отсутствию расписания на выбранный месяц
  const groups = useMemo(() => {
    if (!noScheduleMonth) return allGroups;
    return allGroups.filter((group) => {
      const hasSchedule = group.scheduledMonths?.some(
        (m) => m.yearMonth === noScheduleMonth
      );
      return !hasSchedule;
    });
  }, [allGroups, noScheduleMonth]);

  const hasActiveFilters =
    filters.search ||
    filters.studioId ||
    filters.teacherId ||
    filters.roomId ||
    filters.status ||
    filters.isPaid !== undefined ||
    filters.ageRange;

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Группы</h2>
          <p className="text-muted-foreground">
            Управление группами культурного центра
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/groups/planner">
              <CalendarDays className="mr-2 h-4 w-4" />
              Планирование расписания
            </Link>
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить группу
          </Button>
        </div>
      </div>

      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
              {hasActiveFilters && (
                <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {[filters.search, filters.studioId, filters.teacherId, filters.roomId, filters.status, filters.isPaid !== undefined ? 'paid' : null, filters.ageRange].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-3">
          <div className="rounded-lg border bg-card p-4">
            <GroupFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Фильтр по отсутствию расписания */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">Нет расписания на:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {availableMonths.map((month) => (
            <button
              key={month.value}
              onClick={() => setNoScheduleMonth(noScheduleMonth === month.value ? null : month.value)}
              className={`pb-0.5 border-b border-dashed transition-colors ${
                noScheduleMonth === month.value
                  ? 'text-foreground border-foreground font-medium'
                  : 'text-muted-foreground border-muted-foreground/50 hover:text-foreground hover:border-foreground'
              }`}
            >
              {month.label}
            </button>
          ))}
        </div>
        {noScheduleMonth && (
          <span className="text-orange-500 font-medium">
            Найдено: {groups.length}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список групп</CardTitle>
          <CardDescription>
            Всего групп: {groups.length}{noScheduleMonth && ` (без расписания на ${availableMonths.find(m => m.value === noScheduleMonth)?.label})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupsTable groups={groups} isLoading={isLoading} />
        </CardContent>
      </Card>

      <GroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
