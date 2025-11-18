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
    { label: 'Аренда', value: 'rental' },
    { label: 'Мероприятия', value: 'event' },
    { label: 'Резерв', value: 'reservation' },
  ];

  const selectedEventTypes = Array.isArray(filters.eventTypeId)
    ? filters.eventTypeId
    : filters.eventTypeId
    ? [filters.eventTypeId]
    : [];

  const handleEventTypeToggle = (value: string) => {
    let newSelected: string[];
    if (selectedEventTypes.includes(value)) {
      newSelected = selectedEventTypes.filter(v => v !== value);
    } else {
      newSelected = [...selectedEventTypes, value];
    }
    onFiltersChange({
      ...filters,
      eventTypeId: newSelected.length > 0 ? newSelected : undefined,
    });
  };

  const handleShowAll = () => {
    onFiltersChange({
      ...filters,
      eventTypeId: undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Event Type Filter as Links */}
      <div className="flex items-center gap-3 text-base">
        <span className="text-muted-foreground font-medium">Показать:</span>
        <button
          onClick={handleShowAll}
          className={`transition-colors font-medium px-2 py-1 rounded ${
            selectedEventTypes.length === 0
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Все
        </button>
        {calendarEventTypeOptions.map((type, index) => (
          <button
            key={type.value}
            onClick={() => handleEventTypeToggle(type.value)}
            className={`transition-colors font-medium px-2 py-1 rounded ${
              selectedEventTypes.includes(type.value)
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Other Filters */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 grid grid-cols-3 gap-3">
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
        </div>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Сбросить
          </Button>
        )}
      </div>
    </div>
  );
}
