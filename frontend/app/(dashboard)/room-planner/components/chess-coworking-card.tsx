'use client';

import { Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WorkspaceStatusChip } from './workspace-status-chip';
import type { CoworkingRoomStatus, CoworkingWorkspaceStatus } from '@/hooks/use-coworking-workspaces';

interface ChessCoworkingCardProps {
  coworkingStatus: CoworkingRoomStatus;
  onWorkspaceClick: (workspace: CoworkingWorkspaceStatus) => void;
  scale?: number;
}

export function ChessCoworkingCard({
  coworkingStatus,
  onWorkspaceClick,
  scale = 1.0,
}: ChessCoworkingCardProps) {
  const fontSize = Math.max(9, Math.round(10 * scale));

  return (
    <div
      className="absolute inset-0 p-2 flex flex-col bg-blue-50/50 border border-blue-100 rounded-md m-1"
      style={{ top: '4px', bottom: '4px', left: '4px', right: '4px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 gap-1 flex-shrink-0">
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-5 bg-blue-100 text-blue-700 border-blue-200"
          style={{ fontSize: `${fontSize}px` }}
        >
          <Briefcase className="h-3 w-3 mr-1" />
          Коворкинг
        </Badge>
        <span
          className="text-muted-foreground whitespace-nowrap"
          style={{ fontSize: `${fontSize}px` }}
        >
          {coworkingStatus.availableOnDate}/{coworkingStatus.totalWorkspaces}
        </span>
      </div>

      {/* Workspace list - vertical layout */}
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
        {coworkingStatus.workspaces.map((ws) => (
          <WorkspaceStatusChip
            key={ws.workspaceId}
            workspace={ws}
            onClick={() => onWorkspaceClick(ws)}
          />
        ))}
      </div>
    </div>
  );
}
