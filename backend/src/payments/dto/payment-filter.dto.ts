import { IsUUID, IsEnum, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentStatus, PaymentType } from '@prisma/client';

export class PaymentFilterDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @IsUUID()
  @IsOptional()
  rentalId?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}
