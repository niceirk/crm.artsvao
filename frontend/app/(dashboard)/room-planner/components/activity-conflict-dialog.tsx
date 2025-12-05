'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Activity } from '@/hooks/use-room-planner';

interface ActivityConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictingActivities: Activity[];
}

export function ActivityConflictDialog({
  open,
  onOpenChange,
  conflictingActivities,
}: ActivityConflictDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Невозможно переместить событие</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-3">
                В выбранное время уже запланированы другие события:
              </p>
              <ul className="space-y-2">
                {conflictingActivities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activity.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{activity.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.startTime} - {activity.endTime}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Понятно</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
