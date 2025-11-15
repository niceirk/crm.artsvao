'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useRooms } from '@/hooks/use-rooms';
import { useTeachers } from '@/hooks/use-teachers';
import { useGroups } from '@/hooks/use-groups';
import { ScheduleFilters as FilterType } from '@/lib/api/schedules';
import { MultiSelect } from '@/components/ui/multi-select';

interface ScheduleFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function ScheduleFilters({ filters, onFiltersChange }: ScheduleFiltersProps) {
  const { data: rooms } = useRooms();
  const { data: teachers } = useTeachers();
  const { data: groups } = useGroups();

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.roomId ||
    filters.teacherId ||
    filters.groupId ||
    filters.eventTypeId;

  // Convert data to MultiSelect options
  const roomOptions = rooms?.map((room) => ({
    label: `${room.name}${room.number ? ` (${room.number})` : ''}`,
    value: room.id,
  })) || [];

  const teacherOptions = teachers?.map((teacher) => ({
    label: `${teacher.lastName} ${teacher.firstName}`,
    value: teacher.id,
  })) || [];

  const groupOptions = groups?.map((group) => ({
    label: group.name,
    value: group.id,
  })) || [];

  // Calendar event type options (fixed list)
  const calendarEventTypeOptions = [
    { label: 'Занятия', value: 'schedule' },
    { label: 'Мероприятия', value: 'event' },
    { label: 'Резерв', value: 'reservation' },
    { label: 'Аренда', value: 'rental' },
  ];

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1 grid grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Помещения</label>
          <MultiSelect
            options={roomOptions}
            selected={Array.isArray(filters.roomId) ? filters.roomId : filters.roomId ? [filters.roomId] : []}
            onChange={(selected) =>
              onFiltersChange({
                ...filters,
                roomId: selected.length > 0 ? selected : undefined,
              })
            }
            placeholder="Все помещения"
            emptyText="Помещения не найдены"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Преподаватели</label>
          <MultiSelect
            options={teacherOptions}
            selected={Array.isArray(filters.teacherId) ? filters.teacherId : filters.teacherId ? [filters.teacherId] : []}
            onChange={(selected) =>
              onFiltersChange({
                ...filters,
                teacherId: selected.length > 0 ? selected : undefined,
              })
            }
            placeholder="Все преподаватели"
            emptyText="Преподаватели не найдены"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Группы</label>
          <MultiSelect
            options={groupOptions}
            selected={Array.isArray(filters.groupId) ? filters.groupId : filters.groupId ? [filters.groupId] : []}
            onChange={(selected) =>
              onFiltersChange({
                ...filters,
                groupId: selected.length > 0 ? selected : undefined,
              })
            }
            placeholder="Все группы"
            emptyText="Группы не найдены"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Типы событий</label>
          <MultiSelect
            options={calendarEventTypeOptions}
            selected={Array.isArray(filters.eventTypeId) ? filters.eventTypeId : filters.eventTypeId ? [filters.eventTypeId] : []}
            onChange={(selected) =>
              onFiltersChange({
                ...filters,
                eventTypeId: selected.length > 0 ? selected : undefined,
              })
            }
            placeholder="Все типы событий"
            emptyText="Типы событий не найдены"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={handleClearFilters}>
          <X className="mr-2 h-4 w-4" />
          Сбросить
        </Button>
      )}
    </div>
  );
}
