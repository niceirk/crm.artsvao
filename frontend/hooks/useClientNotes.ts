import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClientNotes,
  getClientNote,
  createClientNote,
  updateClientNote,
  deleteClientNote,
} from '@/lib/api/client-notes';
import type { CreateClientNoteDto, UpdateClientNoteDto } from '@/lib/types/client-notes';
import { toast } from '@/lib/utils/toast';

/**
 * Hook для получения всех заметок клиента
 */
export const useClientNotes = (clientId: string) => {
  return useQuery({
    queryKey: ['clients', clientId, 'notes'],
    queryFn: () => getClientNotes(clientId),
    enabled: !!clientId,
  });
};

/**
 * Hook для получения одной заметки
 */
export const useClientNote = (clientId: string, noteId: string) => {
  return useQuery({
    queryKey: ['clients', clientId, 'notes', noteId],
    queryFn: () => getClientNote(clientId, noteId),
    enabled: !!clientId && !!noteId,
  });
};

/**
 * Hook для создания заметки
 */
export const useCreateClientNote = (clientId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientNoteDto) => createClientNote(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', clientId, 'notes'] });
      toast.success('Заметка добавлена', {
        description: 'Новая заметка успешно создана',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось создать заметку',
      });
    },
  });
};

/**
 * Hook для обновления заметки
 */
export const useUpdateClientNote = (clientId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: UpdateClientNoteDto }) =>
      updateClientNote(clientId, noteId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', clientId, 'notes'] });
      queryClient.invalidateQueries({ queryKey: ['clients', clientId, 'notes', variables.noteId] });
      toast.success('Заметка обновлена', {
        description: 'Заметка успешно обновлена',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось обновить заметку',
      });
    },
  });
};

/**
 * Hook для удаления заметки
 */
export const useDeleteClientNote = (clientId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteClientNote(clientId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', clientId, 'notes'] });
      toast.success('Заметка удалена', {
        description: 'Заметка успешно удалена',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось удалить заметку',
      });
    },
  });
};
