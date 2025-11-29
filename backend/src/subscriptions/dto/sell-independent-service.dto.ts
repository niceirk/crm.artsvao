import { IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SellIndependentServiceDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  quantity?: number = 1;

  @IsOptional()
  @IsString()
  notes?: string;
}
