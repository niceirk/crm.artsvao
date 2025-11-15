'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Users, Plus, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { useClientRelations, useDeleteClientRelation } from '@/hooks/useClients';
import { AddRelationDialog } from './add-relation-dialog';
import type { Client, ClientRelation, RelationType } from '@/lib/types/clients';

interface ClientRelationsCardProps {
  client: Client;
}

const relationTypeLabels: Record<RelationType, string> = {
  PARENT: 'Родитель',
  CHILD: 'Ребенок',
  SPOUSE: 'Супруг(а)',
  SIBLING: 'Брат/Сестра',
};

export function ClientRelationsCard({ client }: ClientRelationsCardProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [relationToDelete, setRelationToDelete] = useState<ClientRelation | null>(null);

  const { data: relationsData, isLoading } = useClientRelations(client.id);
  const deleteRelation = useDeleteClientRelation();

  const handleDelete = async () => {
    if (!relationToDelete) return;

    await deleteRelation.mutateAsync({
      clientId: client.id,
      relationId: relationToDelete.id,
    });

    setRelationToDelete(null);
  };

  // Объединяем relations и relatedTo для отображения
  const allRelations = [
    ...(relationsData?.relations || []),
    ...(relationsData?.relatedTo || []),
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Родственные связи
              </CardTitle>
              <CardDescription>
                Связанные клиенты и родственники
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить связь
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allRelations.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="flex justify-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Нет родственных связей</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Нажмите "Добавить связь" чтобы создать родственную связь
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {allRelations.map((relation) => {
                // Определяем, какой клиент является родственником
                const isOutgoing = relation.clientId === client.id;
                const relatedPerson = isOutgoing ? relation.relatedClient : relation.client;

                if (!relatedPerson) return null;

                return (
                  <div
                    key={relation.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {relatedPerson.lastName} {relatedPerson.firstName}{' '}
                          {relatedPerson.middleName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            {relationTypeLabels[relation.relationType]}
                          </Badge>
                          {!isOutgoing && (
                            <span className="text-xs text-muted-foreground">
                              (обратная связь)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/clients/${relatedPerson.id}`}>
                        <Button variant="ghost" size="sm">
                          Открыть
                        </Button>
                      </Link>
                      {isOutgoing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRelationToDelete(relation)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог добавления связи */}
      <AddRelationDialog
        clientId={client.id}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!relationToDelete} onOpenChange={() => setRelationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить родственную связь?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить связь с{' '}
              {relationToDelete?.relatedClient && (
                <>
                  {relationToDelete.relatedClient.lastName}{' '}
                  {relationToDelete.relatedClient.firstName}
                </>
              )}
              ? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRelation.isPending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteRelation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteRelation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
