import { IsEnum, IsOptional, IsDateString, IsString, IsInt } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
