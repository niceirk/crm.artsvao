import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCompensationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  adjustedAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
