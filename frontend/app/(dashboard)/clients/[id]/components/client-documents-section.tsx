'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Edit, Calendar, Building, Copy, Hash, Globe, Clock } from 'lucide-react';
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback для HTTP
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      toast.success(`${label} скопировано`);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const CopyableField = ({
    value,
    label,
    icon: Icon,
    prefix
  }: {
    value: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    prefix?: string;
  }) => (
    <div
      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
      onClick={() => copyToClipboard(value, label)}
      title={`Нажмите, чтобы скопировать`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span className="truncate max-w-[150px]">{prefix}{value}</span>
      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

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

                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground mb-1">
                      {doc.series && (
                        <CopyableField
                          value={doc.series}
                          label="Серия"
                          prefix="Серия: "
                        />
                      )}
                      {doc.number && (
                        <CopyableField
                          value={doc.number}
                          label="Номер"
                          prefix="№ "
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {doc.issuedBy && (
                        <CopyableField
                          value={doc.issuedBy}
                          label="Кем выдан"
                          icon={Building}
                        />
                      )}
                      {doc.issuedAt && (
                        <CopyableField
                          value={formatDate(doc.issuedAt)}
                          label="Дата выдачи"
                          icon={Calendar}
                        />
                      )}
                      {doc.documentType === 'PASSPORT' && doc.departmentCode && (
                        <CopyableField
                          value={doc.departmentCode}
                          label="Код подразделения"
                          icon={Hash}
                        />
                      )}
                      {doc.expiresAt && doc.documentType !== 'PASSPORT' && (
                        <CopyableField
                          value={formatDate(doc.expiresAt)}
                          label="Срок действия"
                          icon={Clock}
                          prefix="До: "
                        />
                      )}
                      {doc.documentType === 'FOREIGN_PASSPORT' && doc.citizenship && (
                        <CopyableField
                          value={doc.citizenship}
                          label="Гражданство"
                          icon={Globe}
                        />
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
