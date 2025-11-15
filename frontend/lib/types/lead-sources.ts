export interface LeadSource {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    clients: number;
  };
}

export interface CreateLeadSourceDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLeadSourceDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}
