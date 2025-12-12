import { formatDayHeader } from '../_lib/utils';

interface DayHeaderProps {
  date: string;
}

export function DayHeader({ date }: DayHeaderProps) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="h-px flex-1 bg-border" />
      <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">
        {formatDayHeader(date)}
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
