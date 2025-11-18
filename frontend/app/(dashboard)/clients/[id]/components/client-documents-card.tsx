'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Calendar, Building, Edit } from 'lucide-react';
import type { Client, ClientDocument, DocumentType } from '@/lib/types/clients';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ClientDocumentDialog } from './client-document-dialog';
import { deleteClientDocument } from '@/lib/api/clients';
import { toast } from 'sonner';

interface ClientDocumentsCardProps {
  client: Client;
  onRefresh?: () => void;
  embedded?: boolean;
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

export function ClientDocumentsCard({ client, onRefresh, embedded = false }: ClientDocumentsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ClientDocument | null>(null);
  const documents = client.documents || [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: ru });
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

  const content = (
    <div className={embedded ? '' : 'space-y-4'}>
      {!embedded && (
        <div className="flex items-center justify-between mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить документ
          </Button>
        </div>
      )}
      {embedded && (
        <div className="flex justify-end mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>
      )}
      <div>
          {documents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Нет добавленных документов</p>
              <p className="text-sm">Нажмите &quot;Добавить документ&quot; для создания</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
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
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(doc)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.documentType)}
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
    </div>
  );

  return (
    <>
      {embedded ? (
        content
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Документы</CardTitle>
            </div>
            <CardDescription>
              Документы клиента ({documents.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {content}
          </CardContent>
        </Card>
      )}

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
