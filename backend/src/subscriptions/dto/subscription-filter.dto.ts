import { IsOptional, IsUUID, IsEnum, IsString, IsNumber, Min } from 'class-validator';
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
