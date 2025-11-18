import { IsOptional, IsString, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientStatus } from '@prisma/client';

export class ClientFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  leadSourceId?: string;

  @IsOptional()
  @IsString()
  benefitCategoryId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(['all', 'with', 'without'])
  subscriptionFilter?: 'all' | 'with' | 'without';

  @IsOptional()
  @IsEnum(['name', 'createdAt', 'dateOfBirth', 'status'])
  sortBy?: 'name' | 'createdAt' | 'dateOfBirth' | 'status';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
