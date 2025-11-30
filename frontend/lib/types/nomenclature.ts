export type NomenclatureItemType = 'SUBSCRIPTION' | 'SINGLE_SESSION' | 'VISIT_PACK' | 'INDEPENDENT_SERVICE';

export interface NomenclatureItem {
  id: string;
  type: NomenclatureItemType;
  name: string;
  description?: string;
  price: number;
  pricePerLesson?: number | null;
  vatRate: number;
  isActive: boolean;
  group?: {
    id: string;
    name: string;
    studio: {
      id: string;
      name: string;
    };
  };
  category?: {
    id: string;
    name: string;
    defaultVatRate: number;
  };
  subscriptionType?: 'UNLIMITED' | 'VISIT_PACK';
  createdAt: string;
  updatedAt: string;
}

export interface NomenclatureStats {
  totalItems: number;
  subscriptions: number;
  singleSessions: number;
  independentServices: number;
  categories: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultVatRate: number;
}

export interface NomenclatureFilterDto {
  type?: NomenclatureItemType;
  categoryId?: string;
  groupId?: string;
  search?: string;
  isActive?: boolean;
}

// DTO для создания/обновления типа абонемента
export interface CreateSubscriptionTypeNomenclatureDto {
  name: string;
  description?: string;
  groupId: string;
  price: number;
  pricePerLesson?: number;
  vatRate?: number;
  isActive?: boolean;
}

export interface UpdateSubscriptionTypeNomenclatureDto {
  name?: string;
  description?: string;
  groupId?: string;
  price?: number;
  pricePerLesson?: number;
  vatRate?: number;
  isActive?: boolean;
}

// DTO для обновления разового посещения
export interface UpdateSingleSessionDto {
  groupId: string;
  singleSessionPrice: number;
  singleSessionVatRate?: number;
  serviceCategoryId?: string;
}

// DTO для создания/обновления категории услуг
export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultVatRate?: number;
}

export interface UpdateServiceCategoryDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultVatRate?: number;
}

// DTO для создания/обновления независимой услуги
export interface IndependentService {
  id: string;
  name: string;
  description?: string;
  price: number;
  vatRate: number;
  isActive: boolean;
  category?: {
    id: string;
    name: string;
    defaultVatRate: number;
  };
}

export interface CreateIndependentServiceDto {
  name: string;
  description?: string;
  price: number;
  vatRate?: number;
  categoryId?: string;
  isActive?: boolean;
}

export interface UpdateIndependentServiceDto {
  name?: string;
  description?: string;
  price?: number;
  vatRate?: number;
  categoryId?: string;
  isActive?: boolean;
}
