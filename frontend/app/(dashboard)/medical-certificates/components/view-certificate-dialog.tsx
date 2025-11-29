'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Calendar,
  User,
  FileText,
  ExternalLink,
  Clock,
  UserCheck,
  Loader2,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { MedicalCertificate } from '@/lib/types/medical-certificates';
import { useQuery } from '@tanstack/react-query';
import { medicalCertificatesApi } from '@/lib/api/medical-certificates';

interface ViewCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: MedicalCertificate | null;
  onEdit?: () => void;
}

const attendanceStatusLabels: Record<string, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Отсутствовал',
  EXCUSED: 'Уваж. причина',
};

const attendanceStatusColors: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  EXCUSED: 'bg-yellow-100 text-yellow-800',
};

export function ViewCertificateDialog({
  open,
  onOpenChange,
  certificate,
  onEdit,
}: ViewCertificateDialogProps) {
  // Загрузка примененных занятий
  const { data: appliedSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['medical-certificates', certificate?.id, 'schedules'],
    queryFn: () => medicalCertificatesApi.getAppliedSchedules(certificate!.id),
    enabled: open && !!certificate?.id,
  });

  if (!certificate) return null;

  const getClientFullName = () => {
    const { firstName, lastName, middleName } = certificate.client;
    return [lastName, firstName, middleName].filter(Boolean).join(' ');
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, 'HH:mm');
    } catch {
      return timeString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Просмотр справки</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Клиент */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Клиент</span>
              </div>
              <p className="font-medium">{getClientFullName()}</p>
              {certificate.client.phone && (
                <p className="text-sm text-muted-foreground">{certificate.client.phone}</p>
              )}
            </div>

            {/* Период болезни */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Период болезни</span>
              </div>
              <p className="font-medium">
                {format(new Date(certificate.startDate), 'dd MMMM yyyy', { locale: ru })} —{' '}
                {format(new Date(certificate.endDate), 'dd MMMM yyyy', { locale: ru })}
              </p>
            </div>

            {/* Создано */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Создано</span>
              </div>
              <p className="font-medium">
                {format(new Date(certificate.createdAt), 'dd.MM.yyyy в HH:mm', { locale: ru })}
              </p>
            </div>

            {/* Кем создано */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                <span>Кем создано</span>
              </div>
              <p className="font-medium">
                {certificate.createdBy.lastName} {certificate.createdBy.firstName}
              </p>
            </div>
          </div>

          <Separator />

          {/* Файл справки */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Файл справки</span>
            </div>
            <a
              href={certificate.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
            >
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">{certificate.fileName || 'Открыть файл'}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>

          {/* Примечания */}
          {certificate.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Примечания</div>
                <p className="text-sm whitespace-pre-wrap">{certificate.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Примененные занятия */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Занятия со статусом "Уважительная причина"
              </div>
              <Badge variant="secondary">
                {certificate._count?.appliedSchedules || appliedSchedules?.length || 0}
              </Badge>
            </div>

            {schedulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : appliedSchedules && appliedSchedules.length > 0 ? (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Время</TableHead>
                      <TableHead>Группа</TableHead>
                      <TableHead>Пред. статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appliedSchedules.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {format(new Date(item.schedule.date), 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {formatTime(item.schedule.startTime)} - {formatTime(item.schedule.endTime)}
                        </TableCell>
                        <TableCell>{item.schedule.group?.name || '—'}</TableCell>
                        <TableCell>
                          {item.previousStatus ? (
                            <Badge
                              variant="secondary"
                              className={cn(attendanceStatusColors[item.previousStatus])}
                            >
                              {attendanceStatusLabels[item.previousStatus]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Не отмечено</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                Нет примененных занятий
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
            {onEdit && (
              <Button onClick={onEdit}>
                Редактировать
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
