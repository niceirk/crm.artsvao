import { IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSingleSessionDto {
  @IsUUID()
  groupId: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  singleSessionPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
  singleSessionVatRate?: number;

  @IsOptional()
  @IsUUID()
  serviceCategoryId?: string;
}
