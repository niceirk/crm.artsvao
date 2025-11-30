import { IsEnum, IsOptional, IsNumber, Min, IsInt } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateSubscriptionDto {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remainingVisits?: number;
}
