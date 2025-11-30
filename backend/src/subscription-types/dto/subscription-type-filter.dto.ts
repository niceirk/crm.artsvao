import { IsOptional, IsUUID, IsBoolean, IsEnum, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SubscriptionTypeEnum } from '@prisma/client';

export class SubscriptionTypeFilterDto {
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsEnum(SubscriptionTypeEnum)
  @IsOptional()
  type?: SubscriptionTypeEnum;

  @IsEnum(SubscriptionTypeEnum, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return value;
  })
  excludeTypes?: SubscriptionTypeEnum[];

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
