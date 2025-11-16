import { IsUUID, IsString, IsNumber, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class AddMemberDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  subscriptionTypeId: string;

  @IsDateString()
  purchaseDate: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsString()
  validMonth: string; // Формат "2024-12"

  @IsNumber()
  @Min(0)
  originalPrice: number;

  @IsNumber()
  @Min(0)
  paidPrice: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  remainingVisits?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  purchasedMonths?: number;
}
