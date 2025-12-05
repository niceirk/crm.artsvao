'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Trash2, Plus } from 'lucide-react';
import { useClientNotes, useCreateClientNote, useDeleteClientNote } from '@/hooks/useClientNotes';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const noteSchema = z.object({
  content: z.string().min(1, 'Заметка не может быть пустой'),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface ClientNotesCardProps {
  clientId: string;
}

export function ClientNotesCard({ clientId }: ClientNotesCardProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const { data: notes, isLoading } = useClientNotes(clientId);
  const createNote = useCreateClientNote(clientId);
  const deleteNote = useDeleteClientNote(clientId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
  });

  const onSubmit = (data: NoteFormData) => {
    createNote.mutate(data, {
      onSuccess: () => {
        reset();
        setIsAddingNote(false);
      },
    });
  };

  const handleDelete = (noteId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту заметку?')) {
      deleteNote.mutate(noteId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Заметки</CardTitle>
          </div>
          {!isAddingNote && (
            <Button size="sm" variant="outline" onClick={() => setIsAddingNote(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить заметку
            </Button>
          )}
        </div>
        <CardDescription>История заметок по клиенту</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Форма добавления заметки */}
        {isAddingNote && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border rounded-lg p-4 bg-muted/50">
            <div>
              <Label htmlFor="content">Новая заметка</Label>
              <Textarea
                id="content"
                {...register('content')}
                rows={4}
                placeholder="Введите текст заметки..."
                className="mt-1"
              />
              {errors.content && (
                <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingNote(false);
                  reset();
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createNote.isPending}>
                {createNote.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        )}

        {/* Список заметок */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка заметок...</div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {note.author ? `${note.author.lastName} ${note.author.firstName}` : note.authorName || 'Неизвестный автор'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(note.id)}
                    disabled={deleteNote.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Заметок пока нет. Добавьте первую заметку.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
