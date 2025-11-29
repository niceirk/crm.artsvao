'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import {
  FileHeart,
  Plus,
  ExternalLink,
  Trash2,
  Calendar,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useClientMedicalCertificates,
  useDeleteMedicalCertificate,
} from '@/hooks/use-medical-certificates';
import { MedicalCertificate } from '@/lib/types/medical-certificates';

interface ClientMedicalCertificatesSectionProps {
  clientId: string;
  onRefresh?: () => void;
}

export function ClientMedicalCertificatesSection({
  clientId,
  onRefresh,
}: ClientMedicalCertificatesSectionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<MedicalCertificate | null>(null);

  const { data: certificates, isLoading, refetch } = useClientMedicalCertificates(clientId);
  const deleteMutation = useDeleteMedicalCertificate();

  const handleDelete = async () => {
    if (selectedCertificate) {
      await deleteMutation.mutateAsync(selectedCertificate.id);
      setDeleteDialogOpen(false);
      setSelectedCertificate(null);
      refetch();
      onRefresh?.();
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileHeart className="h-4 w-4" />
          Справки ({certificates?.length || 0})
        </h3>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/medical-certificates/new?clientId=${clientId}`}>
            <Plus className="h-3 w-3 mr-1" />
            Добавить
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : certificates && certificates.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {certificates.map((certificate) => (
            <div
              key={certificate.id}
              className="border rounded p-3 space-y-2 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {format(new Date(certificate.startDate), 'dd.MM.yyyy', { locale: ru })} —{' '}
                    {format(new Date(certificate.endDate), 'dd.MM.yyyy', { locale: ru })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedCertificate(certificate);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <a
                  href={certificate.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Открыть файл
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Badge variant="secondary" className="text-xs">
                  {certificate._count?.appliedSchedules || 0} занятий
                </Badge>
              </div>

              {certificate.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {certificate.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <FileHeart className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm text-muted-foreground">Нет справок</p>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить справку?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Справка будет удалена, но статусы посещений останутся без изменений.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
