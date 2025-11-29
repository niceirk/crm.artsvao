import { IsString, IsNumber, IsOptional, IsUUID, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSubscriptionTypeNomenclatureDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  groupId: string;

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
  @IsBoolean()
  isActive?: boolean = true;
}
