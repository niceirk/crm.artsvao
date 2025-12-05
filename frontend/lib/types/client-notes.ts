export interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  authorName?: string; // Fallback for legacy data
}

export interface CreateClientNoteDto {
  content: string;
}

export interface UpdateClientNoteDto {
  content?: string;
}
