export enum ServiceType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  RENTAL = 'RENTAL',
  SINGLE_SESSION = 'SINGLE_SESSION',
  INDIVIDUAL_LESSON = 'INDIVIDUAL_LESSON',
  OTHER = 'OTHER',
}

export enum UnitOfMeasure {
  MONTH = 'MONTH',
  HOUR = 'HOUR',
  SESSION = 'SESSION',
  DAY = 'DAY',
  PIECE = 'PIECE',
}

export enum WriteOffTiming {
  ON_SALE = 'ON_SALE',
  ON_USE = 'ON_USE',
}

export interface Service {
  id: string;
  version: number; // Версия для оптимистичной блокировки
  name: string;
  description?: string | null;
  categoryId: string;
  serviceType: ServiceType;
  basePrice: number;
  vatRate: number;
  priceWithVat: number;
  unitOfMeasure: UnitOfMeasure;
  writeOffTiming: WriteOffTiming;
  groupId?: string | null;
  roomId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
  };
  group?: {
    id: string;
    name: string;
    studio?: {
      id: string;
      name: string;
    };
  } | null;
  room?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  categoryId: string;
  serviceType: ServiceType;
  basePrice: number;
  vatRate?: number;
  unitOfMeasure: UnitOfMeasure;
  writeOffTiming: WriteOffTiming;
  groupId?: string;
  roomId?: string;
  isActive?: boolean;
}

export interface UpdateServiceDto {
  version?: number; // Для защиты от перезатирания
  name?: string;
  description?: string;
  categoryId?: string;
  serviceType?: ServiceType;
  basePrice?: number;
  vatRate?: number;
  unitOfMeasure?: UnitOfMeasure;
  writeOffTiming?: WriteOffTiming;
  groupId?: string;
  roomId?: string;
  isActive?: boolean;
}

export interface ServiceFilterDto {
  categoryId?: string;
  serviceType?: ServiceType;
  groupId?: string;
  roomId?: string;
}
