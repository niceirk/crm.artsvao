import { IsString, IsNumber, IsOptional, IsUUID, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateIndependentServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price: number;

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
  isActive?: boolean = true;
}
