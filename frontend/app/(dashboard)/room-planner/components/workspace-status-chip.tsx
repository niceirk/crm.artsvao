'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CoworkingWorkspaceStatus } from '@/hooks/use-coworking-workspaces';

interface WorkspaceStatusChipProps {
  workspace: CoworkingWorkspaceStatus;
  onClick: () => void;
  compact?: boolean;
}

const STATUS_STYLES = {
  available: 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer border-green-200',
  occupied: 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer border-red-200',
  maintenance: 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60 border-gray-200',
};

export function WorkspaceStatusChip({
  workspace,
  onClick,
  compact = false,
}: WorkspaceStatusChipProps) {
  const status =
    workspace.baseStatus === 'MAINTENANCE'
      ? 'maintenance'
      : workspace.isOccupiedOnDate
        ? 'occupied'
        : 'available';

  const statusLabel =
    status === 'available'
      ? 'Свободно'
      : status === 'occupied'
        ? 'Занято'
        : 'На обслуживании';

  if (compact) {
    // Компактный режим - маленький чип
    const displayText = workspace.workspaceNumber || workspace.workspaceName.slice(0, 3);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={workspace.baseStatus === 'MAINTENANCE'}
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors border',
              STATUS_STYLES[status]
            )}
          >
            {displayText}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white text-foreground border shadow-md">
          <div className="text-sm">
            <div className="font-medium">{workspace.workspaceName}</div>
            <div className="text-muted-foreground">{statusLabel}</div>
            <div className="text-muted-foreground mt-1">
              {workspace.dailyRate.toLocaleString('ru-RU')} ₽/день
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Полный режим - крупная строка на всю ширину
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={workspace.baseStatus === 'MAINTENANCE'}
      className={cn(
        'w-full px-2 py-1.5 rounded text-xs font-medium transition-colors border flex items-center justify-between',
        STATUS_STYLES[status]
      )}
    >
      <span className="truncate">
        {workspace.workspaceName}
      </span>
      {status !== 'available' && (
        <span className="text-[10px] opacity-75 ml-2 shrink-0">
          {statusLabel}
        </span>
      )}
    </button>
  );
}
