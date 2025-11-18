import { apiClient } from './client';
import type { ClientNote, CreateClientNoteDto, UpdateClientNoteDto } from '../types/client-notes';

export const getClientNotes = async (clientId: string): Promise<ClientNote[]> => {
  const response = await apiClient.get(`/clients/${clientId}/notes`);
  return response.data;
};

export const getClientNote = async (clientId: string, noteId: string): Promise<ClientNote> => {
  const response = await apiClient.get(`/clients/${clientId}/notes/${noteId}`);
  return response.data;
};

export const createClientNote = async (
  clientId: string,
  data: CreateClientNoteDto
): Promise<ClientNote> => {
  const response = await apiClient.post(`/clients/${clientId}/notes`, data);
  return response.data;
};

export const updateClientNote = async (
  clientId: string,
  noteId: string,
  data: UpdateClientNoteDto
): Promise<ClientNote> => {
  const response = await apiClient.patch(`/clients/${clientId}/notes/${noteId}`, data);
  return response.data;
};

export const deleteClientNote = async (clientId: string, noteId: string): Promise<void> => {
  await apiClient.delete(`/clients/${clientId}/notes/${noteId}`);
};
