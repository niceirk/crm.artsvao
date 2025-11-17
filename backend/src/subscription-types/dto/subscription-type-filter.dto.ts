import { IsOptional, IsUUID, IsBoolean, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionTypeEnum } from '@prisma/client';

export class SubscriptionTypeFilterDto {
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsEnum(SubscriptionTypeEnum)
  @IsOptional()
  type?: SubscriptionTypeEnum;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

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
