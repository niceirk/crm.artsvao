'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useStudios } from '@/hooks/use-studios';
import { useTeachers } from '@/hooks/use-teachers';
import { useRooms } from '@/hooks/use-rooms';
import { GroupFilters as FilterType } from '@/lib/api/groups';

interface GroupFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function GroupFilters({ filters, onFiltersChange }: GroupFiltersProps) {
  const { data: studios } = useStudios();
  const { data: teachers } = useTeachers();
  const { data: rooms } = useRooms();

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.search ||
    filters.studioId ||
    filters.teacherId ||
    filters.roomId ||
    filters.status ||
    filters.isPaid !== undefined ||
    filters.ageRange;

  const getTeacherFullName = (teacher: any) => {
    return [teacher.lastName, teacher.firstName, teacher.middleName]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {/* Поиск */}
        <div>
          <Label className="text-xs text-muted-foreground">Поиск</Label>
          <Input
            placeholder="Название группы..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          />
        </div>

        {/* Студия */}
        <div>
          <Label className="text-xs text-muted-foreground">Студия</Label>
          <Select
            value={filters.studioId || '__empty__'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, studioId: value === '__empty__' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Все студии" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все студии</SelectItem>
              {studios?.map(studio => (
                <SelectItem key={studio.id} value={studio.id}>{studio.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Преподаватель */}
        <div>
          <Label className="text-xs text-muted-foreground">Преподаватель</Label>
          <Select
            value={filters.teacherId || '__empty__'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, teacherId: value === '__empty__' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Все преподаватели" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все преподаватели</SelectItem>
              {teachers?.map(teacher => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {getTeacherFullName(teacher)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Помещение */}
        <div>
          <Label className="text-xs text-muted-foreground">Помещение</Label>
          <Select
            value={filters.roomId || '__empty__'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, roomId: value === '__empty__' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Все помещения" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все помещения</SelectItem>
              {rooms?.map(room => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}{room.number ? ` (${room.number})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Возрастная категория */}
        <div>
          <Label className="text-xs text-muted-foreground">Возраст</Label>
          <Select
            value={filters.ageRange || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, ageRange: value === 'all' ? undefined : value as 'child' | 'teen' | 'adult' })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все возраста</SelectItem>
              <SelectItem value="child">Дети (0-12)</SelectItem>
              <SelectItem value="teen">Подростки (13-17)</SelectItem>
              <SelectItem value="adult">Взрослые (18+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Платно/Бесплатно */}
        <div>
          <Label className="text-xs text-muted-foreground">Тип</Label>
          <Select
            value={filters.isPaid === undefined ? '__empty__' : filters.isPaid ? 'paid' : 'free'}
            onValueChange={(value) => {
              let newValue: boolean | undefined;
              if (value === 'paid') newValue = true;
              else if (value === 'free') newValue = false;
              else newValue = undefined;
              onFiltersChange({ ...filters, isPaid: newValue });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все</SelectItem>
              <SelectItem value="paid">Платно</SelectItem>
              <SelectItem value="free">Бесплатно</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Статус */}
        <div>
          <Label className="text-xs text-muted-foreground">Статус</Label>
          <Select
            value={filters.status || '__empty__'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value === '__empty__' ? undefined : value as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Все статусы</SelectItem>
              <SelectItem value="ACTIVE">Активные</SelectItem>
              <SelectItem value="INACTIVE">Неактивные</SelectItem>
              <SelectItem value="ARCHIVED">Архивные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={handleClearFilters}>
          <X className="mr-2 h-4 w-4" />
          Сбросить фильтры
        </Button>
      )}
    </div>
  );
}
