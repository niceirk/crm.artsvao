import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsDateString, Matches, Min } from 'class-validator';
import { RentalType, RentalPeriodType, PriceUnit, RentalPaymentType } from '@prisma/client';

export class CreateRentalApplicationDto {
  @IsEnum(RentalType)
  rentalType: RentalType;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workspaceIds?: string[];

  @IsString()
  clientId: string;

  @IsEnum(RentalPeriodType)
  periodType: RentalPeriodType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:MM format' })
  @IsOptional()
  startTime?: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:MM format' })
  @IsOptional()
  endTime?: string;

  @IsArray()
  @IsDateString({}, { each: true })
  @IsOptional()
  selectedDays?: string[];

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  adjustedPrice?: number;

  @IsString()
  @IsOptional()
  adjustmentReason?: string;

  @IsEnum(PriceUnit)
  priceUnit: PriceUnit;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsEnum(RentalPaymentType)
  @IsOptional()
  paymentType?: RentalPaymentType;

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  ignoreConflicts?: boolean;
}
