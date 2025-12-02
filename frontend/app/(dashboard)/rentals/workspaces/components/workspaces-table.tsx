'use client';

import { useState, useMemo } from 'react';
import { MoreHorizontal, Pencil, Trash2, Copy, Eye, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Workspace } from '@/lib/api/workspaces';
import { useDeleteWorkspace, useCreateWorkspace } from '@/hooks/use-workspaces';
import { EditWorkspaceDialog } from './edit-workspace-dialog';
import { WorkspaceDetailsSheet } from './workspace-details-sheet';
import { BulkEditDialog } from './bulk-edit-dialog';
import { toast } from 'sonner';

interface WorkspacesTableProps {
  workspaces: Workspace[];
  isLoading: boolean;
}

const statusConfig = {
  AVAILABLE: { label: 'Свободно', variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  OCCUPIED: { label: 'Занято', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  MAINTENANCE: { label: 'На обслуживании', variant: 'outline' as const, className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
};

interface GroupedWorkspaces {
  roomId: string;
  roomName: string;
  roomNumber?: string;
  workspaces: Workspace[];
}

export function WorkspacesTable({ workspaces, isLoading }: WorkspacesTableProps) {
  const [editWorkspace, setEditWorkspace] = useState<Workspace | null>(null);
  const [viewWorkspace, setViewWorkspace] = useState<Workspace | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const deleteMutation = useDeleteWorkspace();
  const createMutation = useCreateWorkspace();

  // Группировка по помещениям
  const groupedWorkspaces = useMemo(() => {
    const groups: Map<string, GroupedWorkspaces> = new Map();

    workspaces.forEach(ws => {
      const roomId = ws.roomId || 'no-room';
      if (!groups.has(roomId)) {
        groups.set(roomId, {
          roomId,
          roomName: ws.room?.name || 'Без помещения',
          roomNumber: ws.room?.number,
          workspaces: [],
        });
      }
      groups.get(roomId)!.workspaces.push(ws);
    });

    return Array.from(groups.values()).sort((a, b) => a.roomName.localeCompare(b.roomName));
  }, [workspaces]);

  const toggleGroup = (roomId: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(roomId)) {
      newCollapsed.delete(roomId);
    } else {
      newCollapsed.add(roomId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleCopy = (workspace: Workspace) => {
    const copyData = {
      roomId: workspace.roomId,
      name: `${workspace.name} (копия)`,
      number: workspace.number ? `${workspace.number}-copy` : undefined,
      dailyRate: Number(workspace.dailyRate) || 0,
      monthlyRate: Number(workspace.monthlyRate) || 0,
      status: 'AVAILABLE' as const,
      description: workspace.description,
      amenities: workspace.amenities,
    };

    createMutation.mutate(copyData, {
      onSuccess: () => {
        toast.success('Рабочее место скопировано');
      },
    });
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === workspaces.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workspaces.map(w => w.id)));
    }
  };

  const toggleSelectGroup = (group: GroupedWorkspaces) => {
    const groupIds = group.workspaces.map(w => w.id);
    const allSelected = groupIds.every(id => selectedIds.has(id));

    const newSelected = new Set(selectedIds);
    if (allSelected) {
      groupIds.forEach(id => newSelected.delete(id));
    } else {
      groupIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  const selectedWorkspaces = workspaces.filter(w => selectedIds.has(w.id));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>День</TableHead>
              <TableHead>Месяц</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          Рабочие места не найдены. Добавьте первое рабочее место.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Панель массовых действий */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
          <span className="text-sm text-muted-foreground">
            Выбрано: {selectedIds.size}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkEditOpen(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Редактировать выбранные
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Снять выделение
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {groupedWorkspaces.map((group) => {
          const isCollapsed = collapsedGroups.has(group.roomId);
          const groupIds = group.workspaces.map(w => w.id);
          const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;
          const allSelected = selectedCount === groupIds.length;
          const someSelected = selectedCount > 0 && selectedCount < groupIds.length;

          return (
            <Collapsible
              key={group.roomId}
              open={!isCollapsed}
              onOpenChange={() => toggleGroup(group.roomId)}
            >
              <div className="rounded-md border">
                {/* Заголовок группы */}
                <div className="flex items-center gap-2 p-3 bg-muted/30 border-b">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el && someSelected) {
                        (el as any).indeterminate = true;
                      }
                    }}
                    onCheckedChange={() => toggleSelectGroup(group)}
                  />
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{group.roomName}</span>
                  {group.roomNumber && (
                    <span className="text-sm text-muted-foreground">({group.roomNumber})</span>
                  )}
                  <Badge variant="secondary" className="ml-auto">
                    {group.workspaces.length} мест
                  </Badge>
                </div>

                {/* Таблица рабочих мест */}
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>День</TableHead>
                        <TableHead>Месяц</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.workspaces.map((workspace) => {
                        const status = statusConfig[workspace.status];
                        const isSelected = selectedIds.has(workspace.id);
                        return (
                          <TableRow
                            key={workspace.id}
                            className={`${isSelected ? 'bg-muted/50' : ''} cursor-pointer hover:bg-muted/30`}
                            onClick={() => setEditWorkspace(workspace)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(workspace.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{workspace.name}</div>
                              {workspace.number && (
                                <div className="text-sm text-muted-foreground">№ {workspace.number}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className={status.className}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatPrice(workspace.dailyRate)}</TableCell>
                            <TableCell>{formatPrice(workspace.monthlyRate)}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setViewWorkspace(workspace)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Просмотр
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setEditWorkspace(workspace)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopy(workspace)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Копировать
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteId(workspace.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Панель просмотра */}
      <WorkspaceDetailsSheet
        workspace={viewWorkspace}
        open={!!viewWorkspace}
        onOpenChange={(open) => !open && setViewWorkspace(null)}
        onEdit={(ws) => {
          setViewWorkspace(null);
          setEditWorkspace(ws);
        }}
      />

      {/* Диалог редактирования */}
      <EditWorkspaceDialog
        workspace={editWorkspace}
        open={!!editWorkspace}
        onOpenChange={(open) => !open && setEditWorkspace(null)}
      />

      {/* Диалог массового редактирования */}
      <BulkEditDialog
        workspaces={selectedWorkspaces}
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        onSuccess={() => {
          setSelectedIds(new Set());
          setBulkEditOpen(false);
        }}
      />

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить рабочее место?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Рабочее место будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
