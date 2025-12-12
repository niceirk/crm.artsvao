import { IsEnum, IsOptional, IsString, IsDateString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export class InvoiceFilterDto {
  @IsString()
  @IsOptional()
  clientId?: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsDateString()
  @IsOptional()
  issuedAfter?: string;

  @IsDateString()
  @IsOptional()
  issuedBefore?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  clientSearch?: string;

  @IsString()
  @IsOptional()
  @IsIn(['createdAt', 'clientName', 'totalAmount', 'issuedAt'])
  sortBy?: 'createdAt' | 'clientName' | 'totalAmount' | 'issuedAt';

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 1000;
}
