'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useEvents } from '@/hooks/use-events';
import { EventsTable } from './events-table';
import { EventDialog } from './event-dialog';

const MONTHS = [
  { value: 0, label: 'Январь' },
  { value: 1, label: 'Февраль' },
  { value: 2, label: 'Март' },
  { value: 3, label: 'Апрель' },
  { value: 4, label: 'Май' },
  { value: 5, label: 'Июнь' },
  { value: 6, label: 'Июль' },
  { value: 7, label: 'Август' },
  { value: 8, label: 'Сентябрь' },
  { value: 9, label: 'Октябрь' },
  { value: 10, label: 'Ноябрь' },
  { value: 11, label: 'Декабрь' },
];

export default function EventsPage() {
  const { data: events, isLoading } = useEvents();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const toggleMonth = (monthValue: number) => {
    setSelectedMonths(prev =>
      prev.includes(monthValue)
        ? prev.filter(m => m !== monthValue)
        : [...prev, monthValue]
    );
  };

  const clearMonthFilters = () => {
    setSelectedMonths([]);
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];

    return events.filter(event => {
      // Filter by search query
      const matchesSearch = !searchQuery ||
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.eventType?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.responsibleUser?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.responsibleUser?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by selected months
      const eventMonth = new Date(event.date).getMonth();
      const matchesMonth = selectedMonths.length === 0 || selectedMonths.includes(eventMonth);

      return matchesSearch && matchesMonth;
    });
  }, [events, searchQuery, selectedMonths]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Мероприятия</h2>
          <p className="text-muted-foreground">
            Управление мероприятиями культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить мероприятие
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список мероприятий</CardTitle>
          <CardDescription>
            Найдено мероприятий: {filteredEvents.length} из {events?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, типу или ответственному..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Очистить</span>
              </Button>
            )}
          </div>

          {/* Month Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Фильтр по месяцам:</p>
              {selectedMonths.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMonthFilters}
                  className="h-auto py-1 px-2 text-sm"
                >
                  <X className="mr-1 h-3 w-3" />
                  Очистить
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((month) => {
                const isSelected = selectedMonths.includes(month.value);
                return (
                  <Badge
                    key={month.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer text-sm px-3 py-1.5 ${
                      isSelected
                        ? 'hover:bg-primary/90'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                    onClick={() => toggleMonth(month.value)}
                  >
                    {month.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <EventsTable events={filteredEvents} isLoading={isLoading} />
        </CardContent>
      </Card>

      <EventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
