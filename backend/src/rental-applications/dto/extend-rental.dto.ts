import { IsDateString, IsOptional, Matches, IsNumber, Min } from 'class-validator';

export class ExtendRentalDto {
  @IsDateString()
  newStartDate: string;

  @IsDateString()
  @IsOptional()
  newEndDate?: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:MM format' })
  @IsOptional()
  startTime?: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:MM format' })
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  adjustedPrice?: number;

  @IsOptional()
  adjustmentReason?: string;
}
