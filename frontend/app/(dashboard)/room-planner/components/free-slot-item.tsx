'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '@/lib/utils/time-slots';
import { formatDuration, formatTimeSlot } from '@/lib/utils/time-slots';

interface FreeSlotItemProps {
  slot: TimeSlot;
  variant?: 'compact' | 'detailed';
  onCreateActivity?: (slot: TimeSlot) => void;
}

export function FreeSlotItem({
  slot,
  variant = 'detailed',
  onCreateActivity,
}: FreeSlotItemProps) {
  if (variant === 'compact') {
    return (
      <Badge variant="secondary" className="text-xs font-normal">
        {slot.startTime}–{slot.endTime}
      </Badge>
    );
  }

  // Detailed variant
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-green-300 bg-green-50/50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-green-100">
          <Clock className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <div className="font-medium text-green-700">
            {formatTimeSlot(slot)}
          </div>
          <div className="text-sm text-green-600">
            {formatDuration(slot.duration)}
          </div>
        </div>
      </div>

      {onCreateActivity && (
        <Button
          variant="outline"
          size="sm"
          className="text-green-600 border-green-300 hover:bg-green-100"
          onClick={() => onCreateActivity(slot)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Создать
        </Button>
      )}
    </div>
  );
}
