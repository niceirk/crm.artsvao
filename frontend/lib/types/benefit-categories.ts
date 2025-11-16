export interface BenefitCategory {
  id: string;
  name: string;
  discountPercent: number;
  description?: string | null;
  requiresDocument: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    clients: number;
  };
}

export interface CreateBenefitCategoryDto {
  name: string;
  discountPercent: number;
  description?: string;
  requiresDocument?: boolean;
  isActive?: boolean;
}

export interface UpdateBenefitCategoryDto {
  name?: string;
  discountPercent?: number;
  description?: string;
  requiresDocument?: boolean;
  isActive?: boolean;
}
