'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Calendar, Building, Edit } from 'lucide-react';
import type { DocumentType, CreateClientDocumentDto } from '@/lib/types/clients';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { LocalDocumentDialog } from './local-document-dialog';

interface LocalDocument extends CreateClientDocumentDto {
  localId: string;
}

interface LocalDocumentsManagerProps {
  documents: LocalDocument[];
  onDocumentsChange: (documents: LocalDocument[]) => void;
}

// Маппинг типов документов на русские названия
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

export function LocalDocumentsManager({ documents, onDocumentsChange }: LocalDocumentsManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<LocalDocument | null>(null);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Не указана';
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: ru });
    } catch {
      return 'Некорректная дата';
    }
  };

  const getDocumentDisplay = (doc: LocalDocument) => {
    const parts: string[] = [];

    if (doc.series) parts.push(`Серия: ${doc.series}`);
    if (doc.number) parts.push(`№ ${doc.number}`);

    return parts.join(', ') || 'Данные не указаны';
  };

  const handleAdd = () => {
    setEditingDocument(null);
    setDialogOpen(true);
  };

  const handleEdit = (doc: LocalDocument) => {
    setEditingDocument(doc);
    setDialogOpen(true);
  };

  const handleDelete = (localId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }
    onDocumentsChange(documents.filter(d => d.localId !== localId));
  };

  const handleSave = (doc: CreateClientDocumentDto) => {
    if (editingDocument) {
      // Редактирование существующего документа
      onDocumentsChange(
        documents.map(d =>
          d.localId === editingDocument.localId
            ? { ...doc, localId: editingDocument.localId }
            : d
        )
      );
    } else {
      // Добавление нового документа
      const newDoc: LocalDocument = {
        ...doc,
        localId: `temp-${Date.now()}-${Math.random()}`,
      };
      onDocumentsChange([...documents, newDoc]);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить документ
        </Button>
      </div>

      <div>
        {documents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Нет добавленных документов</p>
            <p className="text-sm">Нажмите &quot;Добавить документ&quot; для создания</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.localId}
                className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">
                        {documentTypeLabels[doc.documentType]}
                      </h4>
                      {doc.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          Основной
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-1">
                      {getDocumentDisplay(doc)}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {doc.issuedBy && (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span>{doc.issuedBy}</span>
                        </div>
                      )}
                      {doc.issuedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Выдан: {formatDate(doc.issuedAt)}</span>
                        </div>
                      )}
                      {doc.expiresAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Действует до: {formatDate(doc.expiresAt)}</span>
                        </div>
                      )}
                    </div>

                    {doc.departmentCode && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Код подразделения: {doc.departmentCode}
                      </p>
                    )}

                    {doc.citizenship && (
                      <p className="text-sm text-muted-foreground">
                        Гражданство: {doc.citizenship}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(doc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(doc.localId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LocalDocumentDialog
        document={editingDocument}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
    </div>
  );
}
