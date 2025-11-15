export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'VIP';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  status: ClientStatus;
  leadSourceId?: string | null;
  leadSource?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  discount?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RelationType = 'PARENT' | 'CHILD' | 'SPOUSE' | 'SIBLING';

export interface ClientRelation {
  id: string;
  clientId: string;
  relatedClientId: string;
  relationType: RelationType;
  createdAt: string;
  relatedClient?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    dateOfBirth?: string | null;
    phone: string;
    email?: string | null;
  };
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    dateOfBirth?: string | null;
    phone: string;
    email?: string | null;
  };
}

export interface CreateRelationDto {
  relatedClientId: string;
  relationType: RelationType;
}

export interface ClientRelationsResponse {
  relations: ClientRelation[];
  relatedTo: ClientRelation[];
}

export interface CreateClientDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  phone?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  notes?: string;
  leadSourceId?: string;
  discount?: string;
}

export interface UpdateClientDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  phone?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  notes?: string;
  status?: ClientStatus;
  leadSourceId?: string;
  discount?: string;
}

export interface ClientFilterParams {
  search?: string;
  status?: ClientStatus;
  leadSource?: string;
  discount?: string;
  page?: number;
  limit?: number;
}

export interface ClientsListResponse {
  data: Client[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
