export interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    services: number;
  };
}

export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateServiceCategoryDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}
