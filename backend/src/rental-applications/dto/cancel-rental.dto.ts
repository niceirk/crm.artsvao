import { IsString, IsOptional } from 'class-validator';

export class CancelRentalDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
