import { IsString, IsNumber, IsOptional, IsUUID, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateIndependentServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
  vatRate?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
