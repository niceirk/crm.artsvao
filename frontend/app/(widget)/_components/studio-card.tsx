import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Studio, Group, WeeklyScheduleItem } from '../_lib/api';
import { getDayName, formatAge, formatTime } from '../_lib/utils';

interface StudioCardProps {
  studio: Studio;
}

function GroupScheduleRow({ group }: { group: Group }) {
  const age = formatAge(group.ageMin, group.ageMax);
  const teacherName = `${group.teacher.firstName} ${group.teacher.lastName}`;

  // Форматируем расписание по дням
  const scheduleStr = formatWeeklySchedule(group.weeklySchedule);

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-medium text-sm">{group.name}</h4>
        {age && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {age}
          </Badge>
        )}
      </div>

      {scheduleStr && (
        <p className="text-sm text-muted-foreground mb-1">{scheduleStr}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{teacherName}</span>
        {group.room && (
          <>
            <span>-</span>
            <span>{group.room.name}</span>
          </>
        )}
      </div>
    </div>
  );
}

function formatWeeklySchedule(schedule: WeeklyScheduleItem[] | null, duration?: number | null): string {
  if (!schedule || schedule.length === 0) return '';

  // Сортируем по дням (поддержка строковых и числовых значений)
  const dayOrder: Record<string, number> = {
    'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5, 'SUN': 6
  };

  const sorted = [...schedule].sort((a, b) => {
    const dayA = typeof a.day === 'string' ? (dayOrder[a.day] ?? 0) : a.day;
    const dayB = typeof b.day === 'string' ? (dayOrder[b.day] ?? 0) : b.day;
    return dayA - dayB;
  });

  return sorted
    .map(item => {
      const dayName = getDayName(item.day);
      const start = formatTime(item.startTime);

      if (item.endTime) {
        return `${dayName} ${start}-${formatTime(item.endTime)}`;
      }

      // Если нет endTime, показываем только время начала
      return `${dayName} ${start}`;
    })
    .join(', ');
}

export function StudioCard({ studio }: StudioCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        {studio.photoUrl && (
          <div className="w-full h-32 mb-3 rounded-lg overflow-hidden">
            <img
              src={studio.photoUrl}
              alt={studio.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{studio.name}</CardTitle>
          {studio.category && (
            <Badge variant="outline" className="text-xs shrink-0">
              {studio.category}
            </Badge>
          )}
        </div>
        {studio.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {studio.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {studio.groups.map(group => (
            <GroupScheduleRow key={group.id} group={group} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
