import { IsUUID, IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsDateString } from 'class-validator';

export class SellSubscriptionDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  subscriptionTypeId: string;

  @IsUUID()
  groupId: string;

  @IsString()
  validMonth: string; // Format: YYYY-MM

  @IsDateString()
  startDate: string; // Format: YYYY-MM-DD

  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  purchasedMonths?: number = 1;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  managerId?: string;

  @IsBoolean()
  @IsOptional()
  applyBenefit?: boolean = true;
}
