'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { useClientRelations, useDeleteClientRelation, useUpdateClientRelation } from '@/hooks/useClients';
import { AddRelationDialog } from './add-relation-dialog';
import type { Client, ClientRelation, RelationType } from '@/lib/types/clients';

interface ClientRelationsSectionProps {
  client: Client;
}

const relationTypeLabels: Record<RelationType, string> = {
  PARENT: 'Родитель',
  CHILD: 'Ребенок',
  SPOUSE: 'Супруг(а)',
  SIBLING: 'Брат/Сестра',
};

function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatAge(age: number): string {
  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${age} лет`;
  }
  if (lastDigit === 1) {
    return `${age} год`;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${age} года`;
  }
  return `${age} лет`;
}

export function ClientRelationsSection({ client }: ClientRelationsSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [relationToDelete, setRelationToDelete] = useState<ClientRelation | null>(null);

  const { data: relationsData, isLoading } = useClientRelations(client.id);
  const deleteRelation = useDeleteClientRelation();
  const updateRelation = useUpdateClientRelation();

  const handleUpdateRelationType = (relationId: string, newType: RelationType) => {
    updateRelation.mutate({
      clientId: client.id,
      relationId,
      relationType: newType,
    });
  };

  const handleDelete = async () => {
    if (!relationToDelete) return;

    await deleteRelation.mutateAsync({
      clientId: client.id,
      relationId: relationToDelete.id,
    });

    setRelationToDelete(null);
  };

  const allRelations = [
    ...(relationsData?.relations || []),
    ...(relationsData?.relatedTo || []),
  ];

  return (
    <>
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Родственные связи
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddDialogOpen(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Добавить
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : allRelations.length === 0 ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-2">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Нет родственных связей</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allRelations.map((relation) => {
              const isOutgoing = relation.clientId === client.id;
              const relatedPerson = isOutgoing ? relation.relatedClient : relation.client;

              if (!relatedPerson) return null;

              return (
                <div
                  key={relation.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <Link
                        href={`/clients/${relatedPerson.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {relatedPerson.lastName} {relatedPerson.firstName}
                        {(() => {
                          const age = calculateAge(relatedPerson.dateOfBirth);
                          return age !== null ? (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({formatAge(age)})
                            </span>
                          ) : null;
                        })()}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Select
                          value={relation.relationType}
                          onValueChange={(value) =>
                            handleUpdateRelationType(relation.id, value as RelationType)
                          }
                          disabled={updateRelation.isPending}
                        >
                          <SelectTrigger className="h-5 w-auto text-xs border-none bg-transparent p-0 pr-6 text-muted-foreground hover:text-foreground focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(relationTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                    onClick={() => setRelationToDelete(relation)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddRelationDialog
        clientId={client.id}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      <AlertDialog open={!!relationToDelete} onOpenChange={() => setRelationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить родственную связь?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить связь с{' '}
              {(() => {
                const person = relationToDelete?.clientId === client.id
                  ? relationToDelete?.relatedClient
                  : relationToDelete?.client;
                return person ? `${person.lastName} ${person.firstName}` : '';
              })()}
              ?
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
