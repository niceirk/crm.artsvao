import { IsString, IsOptional, IsEnum, IsArray, IsDateString, Matches } from 'class-validator';
import { RentalType, RentalPeriodType } from '@prisma/client';

export class CheckAvailabilityDto {
  @IsEnum(RentalType)
  rentalType: RentalType;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workspaceIds?: string[];

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

  @IsString()
  @IsOptional()
  excludeApplicationId?: string;
}
