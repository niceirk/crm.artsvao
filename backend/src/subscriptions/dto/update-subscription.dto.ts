import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remainingVisits?: number;
}
