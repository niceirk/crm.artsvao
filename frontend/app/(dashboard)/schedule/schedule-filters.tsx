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

  const hasAdditionalFilters =
    filters.roomId ||
    filters.teacherId ||
    filters.groupId;

  const roomOptions = rooms?.map((room) => ({
    label: `${room.name}${room.number ? ` (${room.number})` : ''}`,
    value: room.id,
  })) || [];

  const teacherOptions = teachers?.map((teacher) => ({
    label: `${teacher.lastName} ${teacher.firstName}`,
    value: teacher.id,
  })) || [];

  const groupOptions = groups?.data?.map((group) => ({
    label: group.name,
    value: group.id,
  })) || [];

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <div className="text-[10px]">
        <span className="sr-only">Помещения</span>
        <MultiSelect
          className="min-w-[150px]"
          options={roomOptions}
          selected={Array.isArray(filters.roomId) ? filters.roomId : filters.roomId ? [filters.roomId] : []}
          onChange={(selected) =>
            onFiltersChange({
              ...filters,
              roomId: selected.length > 0 ? selected : undefined,
            })
          }
          placeholder="Помещения"
          emptyText="Пусто"
        />
      </div>
      <div className="text-[10px]">
        <span className="sr-only">Преподаватели</span>
        <MultiSelect
          className="min-w-[150px]"
          options={teacherOptions}
          selected={Array.isArray(filters.teacherId) ? filters.teacherId : filters.teacherId ? [filters.teacherId] : []}
          onChange={(selected) =>
            onFiltersChange({
              ...filters,
              teacherId: selected.length > 0 ? selected : undefined,
            })
          }
          placeholder="Преподаватели"
          emptyText="Пусто"
        />
      </div>
      <div className="text-[10px]">
        <span className="sr-only">Группы</span>
        <MultiSelect
          className="min-w-[150px]"
          options={groupOptions}
          selected={Array.isArray(filters.groupId) ? filters.groupId : filters.groupId ? [filters.groupId] : []}
          onChange={(selected) =>
            onFiltersChange({
              ...filters,
              groupId: selected.length > 0 ? selected : undefined,
            })
          }
          placeholder="Группы"
          emptyText="Пусто"
        />
      </div>
      {hasAdditionalFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="border border-muted/40 px-3 py-1 text-xs"
          onClick={handleClearFilters}
        >
          <X className="mr-1 h-3 w-3" />
          Сбросить
        </Button>
      )}
    </div>
  );
}
