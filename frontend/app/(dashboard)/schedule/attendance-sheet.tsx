'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAttendanceBySchedule, useMarkAttendance, useUpdateAttendance } from '@/hooks/use-attendance';
import { groupsApi, type GroupMember } from '@/lib/api/groups';
import { Loader2, Check, X, AlertCircle, UserCheck } from 'lucide-react';
import type { Attendance, AttendanceStatus } from '@/lib/types/attendance';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/utils/toast';

interface AttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  groupId: string;
  groupName: string;
  startTime: string;
}

interface MemberWithAttendance {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  joinedAt: string;
  promotedFromWaitlistAt?: string;
  attendance?: Attendance;
}

export function AttendanceSheet({
  open,
  onOpenChange,
  scheduleId,
  groupId,
  groupName,
  startTime,
}: AttendanceSheetProps) {
  const [members, setMembers] = useState<MemberWithAttendance[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const { data: attendances, isLoading: isLoadingAttendances } = useAttendanceBySchedule(scheduleId);
  const markAttendance = useMarkAttendance();
  const updateAttendance = useUpdateAttendance();

  // Загружаем активных участников группы
  useEffect(() => {
    if (!open) return;

    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        const activeMembers = await groupsApi.getGroupMembers(groupId, 'ACTIVE');

        // Создаём map посещаемости по clientId
        const attendanceMap = new Map<string, Attendance>();
        if (attendances) {
          attendances.forEach((att) => {
            attendanceMap.set(att.clientId, att);
          });
        }

        // Преобразуем участников группы в MemberWithAttendance
        const membersData: MemberWithAttendance[] = activeMembers.map((member) => ({
          id: member.clientId,
          memberId: member.id,
          firstName: member.client.firstName,
          lastName: member.client.lastName,
          middleName: member.client.middleName,
          phone: member.client.phone,
          joinedAt: member.joinedAt,
          promotedFromWaitlistAt: member.promotedFromWaitlistAt,
          attendance: attendanceMap.get(member.clientId),
        }));

        setMembers(membersData);
      } catch (error) {
        console.error('Failed to load group members:', error);
        toast.error('Не удалось загрузить участников группы');
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [groupId, open, attendances]);

  const handleMarkAttendance = async (clientId: string, status: AttendanceStatus) => {
    const member = members.find((m) => m.id === clientId);

    if (!member) return;

    if (member.attendance) {
      // Обновляем существующую отметку
      await updateAttendance.mutateAsync({
        id: member.attendance.id,
        data: { status },
      });
    } else {
      // Создаём новую отметку
      await markAttendance.mutateAsync({
        scheduleId,
        clientId,
        status,
      });
    }
  };

  const getAttendanceStats = () => {
    const present = members.filter((m) => m.attendance?.status === 'PRESENT').length;
    const absent = members.filter((m) => m.attendance?.status === 'ABSENT').length;
    const excused = members.filter((m) => m.attendance?.status === 'EXCUSED').length;
    const notMarked = members.filter((m) => !m.attendance).length;

    return { present, absent, excused, notMarked, total: members.length };
  };

  const stats = getAttendanceStats();
  const isLoading = isLoadingAttendances || loadingMembers;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Журнал посещаемости</SheetTitle>
          <SheetDescription>
            {groupName} • {new Date(startTime).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Статистика */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <div className="text-xs text-muted-foreground">Присутствуют</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-xs text-muted-foreground">Отсутствуют</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.excused}</div>
              <div className="text-xs text-muted-foreground">Уважительная</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.notMarked}</div>
              <div className="text-xs text-muted-foreground">Не отмечено</div>
            </div>
          </div>

          <Separator />

          {/* Список участников */}
          <div className="overflow-y-auto h-[calc(100vh-300px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  В группе нет активных участников
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <AttendanceRow
                    key={member.id}
                    member={member}
                    onMark={handleMarkAttendance}
                    isLoading={markAttendance.isPending || updateAttendance.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface AttendanceRowProps {
  member: MemberWithAttendance;
  onMark: (clientId: string, status: AttendanceStatus) => void;
  isLoading: boolean;
}

function AttendanceRow({ member, onMark, isLoading }: AttendanceRowProps) {
  const { attendance } = member;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">
              {member.lastName} {member.firstName} {member.middleName || ''}
            </div>
            {member.promotedFromWaitlistAt && (
              <Badge variant="outline" className="text-xs">
                Из листа ожидания
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{member.phone}</div>
        </div>

        {/* Статус участника */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <UserCheck className="h-3 w-3 mr-1" />
            Активен
          </Badge>
        </div>
      </div>

      {/* Кнопки отметки */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={attendance?.status === 'PRESENT' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            attendance?.status === 'PRESENT' && 'bg-green-600 hover:bg-green-700'
          )}
          onClick={() => onMark(member.id, 'PRESENT')}
          disabled={isLoading}
        >
          <Check className="h-4 w-4 mr-1" />
          Присутствует
        </Button>
        <Button
          size="sm"
          variant={attendance?.status === 'ABSENT' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            attendance?.status === 'ABSENT' && 'bg-red-600 hover:bg-red-700'
          )}
          onClick={() => onMark(member.id, 'ABSENT')}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1" />
          Отсутствует
        </Button>
        <Button
          size="sm"
          variant={attendance?.status === 'EXCUSED' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            attendance?.status === 'EXCUSED' && 'bg-yellow-600 hover:bg-yellow-700'
          )}
          onClick={() => onMark(member.id, 'EXCUSED')}
          disabled={isLoading}
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Уважительная
        </Button>
      </div>
    </div>
  );
}
