'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Edit, Calendar, Building } from 'lucide-react';
import type { Client, ClientDocument, DocumentType } from '@/lib/types/clients';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ClientDocumentDialog } from './client-document-dialog';
import { deleteClientDocument } from '@/lib/api/clients';
import { toast } from 'sonner';

interface ClientDocumentsSectionProps {
  client: Client;
  onRefresh?: () => void;
}

const documentTypeLabels: Record<DocumentType, string> = {
  PASSPORT: 'Паспорт РФ',
  BIRTH_CERTIFICATE: 'Свидетельство о рождении',
  DRIVERS_LICENSE: 'Водительское удостоверение',
  SNILS: 'СНИЛС',
  FOREIGN_PASSPORT: 'Заграничный паспорт',
  INN: 'ИНН',
  MEDICAL_CERTIFICATE: 'Медицинская справка',
  MSE_CERTIFICATE: 'Справка МСЭ',
  OTHER: 'Другой документ',
};

export function ClientDocumentsSection({ client, onRefresh }: ClientDocumentsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ClientDocument | null>(null);
  const documents = client.documents || [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return format(new Date(dateString), 'd MMM yyyy', { locale: ru });
    } catch {
      return 'Некорректная дата';
    }
  };

  const getDocumentDisplay = (doc: ClientDocument) => {
    const parts: string[] = [];
    if (doc.series) parts.push(`Серия: ${doc.series}`);
    if (doc.number) parts.push(`№ ${doc.number}`);
    return parts.join(', ') || 'Данные не указаны';
  };

  const handleAdd = () => {
    setEditingDocument(null);
    setDialogOpen(true);
  };

  const handleEdit = (doc: ClientDocument) => {
    setEditingDocument(doc);
    setDialogOpen(true);
  };

  const handleDelete = async (documentType: DocumentType) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      await deleteClientDocument(client.id, documentType);
      toast.success('Документ успешно удален');
      onRefresh?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ошибка при удалении документа');
    }
  };

  const handleDialogSuccess = () => {
    onRefresh?.();
  };

  return (
    <>
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Документы ({documents.length})
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Добавить
          </Button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-4">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Нет документов</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border rounded p-3 space-y-1 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium">
                        {documentTypeLabels[doc.documentType]}
                      </h4>
                      {doc.isPrimary && (
                        <Badge variant="secondary" className="text-[10px]">
                          Основной
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mb-1">
                      {getDocumentDisplay(doc)}
                    </p>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {doc.issuedBy && (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{doc.issuedBy}</span>
                        </div>
                      )}
                      {doc.issuedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(doc.issuedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEdit(doc)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDelete(doc.documentType)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientDocumentDialog
        clientId={client.id}
        document={editingDocument}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
