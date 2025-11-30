import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsUUID, Min } from 'class-validator';
import { SubscriptionTypeEnum } from '@prisma/client';

export class CreateSubscriptionTypeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  groupId: string;

  @IsEnum(SubscriptionTypeEnum)
  type: SubscriptionTypeEnum;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerLesson?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
