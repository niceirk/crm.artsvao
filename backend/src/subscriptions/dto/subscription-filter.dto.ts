import { IsOptional, IsUUID, IsEnum, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '@prisma/client';

export class SubscriptionFilterDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsIn(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  statusCategory?: 'ACTIVE' | 'INACTIVE';

  @IsIn(['purchaseDate', 'createdAt'])
  @IsOptional()
  sortBy?: 'purchaseDate' | 'createdAt';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  validMonth?: string; // Format: YYYY-MM

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 50;
}
