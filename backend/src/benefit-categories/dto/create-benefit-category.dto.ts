import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, MinLength } from 'class-validator';

export class CreateBenefitCategoryDto {
  @IsString()
  @MinLength(1, { message: 'Название не может быть пустым' })
  name: string;

  @IsNumber({}, { message: 'Процент скидки должен быть числом' })
  @Min(0, { message: 'Процент скидки не может быть отрицательным' })
  @Max(100, { message: 'Процент скидки не может превышать 100' })
  discountPercent: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
