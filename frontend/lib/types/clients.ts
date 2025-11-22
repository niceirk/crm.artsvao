export type ClientType = 'INDIVIDUAL' | 'LEGAL_ENTITY';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'VIP';

export interface Client {
  id: string;
  clientType: ClientType;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  companyName?: string | null;
  inn?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  passportNumber?: string | null;
  birthCertificate?: string | null;
  snils?: string | null;
  phoneAdditional?: string | null;
  status: ClientStatus;
  leadSourceId?: string | null;
  leadSource?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  benefitCategoryId?: string | null;
  benefitCategory?: {
    id: string;
    name: string;
    discountPercent: number;
  } | null;
  discount?: string | null;
  documents?: ClientDocument[];
  telegramAccounts?: TelegramAccount[];
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
  clientType?: ClientType;
  firstName: string;
  lastName: string;
  middleName?: string;
  companyName?: string;
  inn?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  phone?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  notes?: string;
  passportNumber?: string;
  birthCertificate?: string;
  snils?: string;
  phoneAdditional?: string;
  leadSourceId?: string;
  benefitCategoryId?: string;
  discount?: string;
}

export interface UpdateClientDto {
  clientType?: ClientType;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  companyName?: string;
  inn?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  phone?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  notes?: string;
  passportNumber?: string;
  birthCertificate?: string;
  snils?: string;
  phoneAdditional?: string;
  status?: ClientStatus;
  leadSourceId?: string;
  benefitCategoryId?: string;
  discount?: string;
}

export interface ClientFilterParams {
  search?: string;
  status?: ClientStatus;
  leadSourceId?: string;
  benefitCategoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  subscriptionFilter?: 'all' | 'with' | 'without';
  sortBy?: 'name' | 'createdAt' | 'dateOfBirth' | 'status';
  sortOrder?: 'asc' | 'desc';
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

// Типы документов
export type DocumentType =
  | 'PASSPORT'
  | 'BIRTH_CERTIFICATE'
  | 'DRIVERS_LICENSE'
  | 'SNILS'
  | 'FOREIGN_PASSPORT'
  | 'INN'
  | 'MEDICAL_CERTIFICATE'
  | 'MSE_CERTIFICATE'
  | 'OTHER';

export interface ClientDocument {
  id: string;
  clientId: string;
  documentType: DocumentType;
  series?: string | null;
  number?: string | null;
  issuedBy?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  departmentCode?: string | null;
  isPrimary: boolean;
  citizenship?: string | null;
  fullDisplay?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDocumentDto {
  documentType: DocumentType;
  series?: string;
  number?: string;
  issuedBy?: string;
  issuedAt?: string;
  expiresAt?: string;
  departmentCode?: string;
  isPrimary?: boolean;
  citizenship?: string;
  fullDisplay?: string;
}

export interface UpdateClientDocumentDto {
  series?: string;
  number?: string;
  issuedBy?: string;
  issuedAt?: string;
  expiresAt?: string;
  departmentCode?: string;
  isPrimary?: boolean;
  citizenship?: string;
  fullDisplay?: string;
}

export interface DocumentTypeConfig {
  label: string;
  fields: string[];
  requiredFields: string[];
}

export type DocumentTypesConfig = Record<DocumentType, DocumentTypeConfig>;

// Telegram интеграция
export type ConversationStatus = 'OPEN' | 'CLOSED';

export interface TelegramAccount {
  id: string;
  username?: string | null;
  firstName: string;
  lastName?: string | null;
  isNotificationsEnabled: boolean;
  createdAt: string;
  conversations?: {
    id: string;
    status: ConversationStatus;
  }[];
}
