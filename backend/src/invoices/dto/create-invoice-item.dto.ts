import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ServiceType, WriteOffTiming } from '@prisma/client';

export class CreateInvoiceItemDto {
  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsString()
  @IsOptional()
  serviceDescription?: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsNumber()
  @Min(0)
  quantity: number = 1;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsNumber()
  @Min(0)
  vatRate: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPercent?: number;

  @IsEnum(WriteOffTiming)
  @IsNotEmpty()
  writeOffTiming: WriteOffTiming;

  @IsBoolean()
  @IsOptional()
  isPriceAdjusted?: boolean;

  @IsString()
  @IsOptional()
  adjustmentReason?: string;
}
