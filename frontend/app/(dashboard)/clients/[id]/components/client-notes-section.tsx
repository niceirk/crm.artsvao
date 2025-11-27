'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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

interface ClientNotesSectionProps {
  clientId: string;
}

export function ClientNotesSection({ clientId }: ClientNotesSectionProps) {
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
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Заметки
        </h3>
        {!isAddingNote && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingNote(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Добавить
          </Button>
        )}
      </div>

      {/* Форма добавления заметки */}
      {isAddingNote && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border rounded p-3 bg-muted/30 mb-3">
          <div>
            <Label htmlFor="content" className="text-xs">Новая заметка</Label>
            <Textarea
              id="content"
              {...register('content')}
              rows={3}
              placeholder="Введите текст заметки..."
              className="mt-1"
            />
            {errors.content && (
              <p className="text-xs text-destructive mt-1">{errors.content.message}</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setIsAddingNote(false);
                reset();
              }}
            >
              Отмена
            </Button>
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={createNote.isPending}>
              {createNote.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      )}

      {/* Список заметок */}
      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">Загрузка...</div>
      ) : notes && notes.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="border rounded p-3 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium">
                    {note.author
                      ? `${note.author.lastName} ${note.author.firstName}`
                      : note.authorName || 'Неизвестный автор'
                    }
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(note.createdAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDelete(note.id)}
                  disabled={deleteNote.isPending}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Заметок пока нет
        </div>
      )}
    </div>
  );
}
