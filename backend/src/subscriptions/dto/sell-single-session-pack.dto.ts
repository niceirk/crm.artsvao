import { IsUUID, IsInt, Min, Max, IsString, IsOptional, IsBoolean } from 'class-validator';

export class SellSingleSessionPackDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  groupId: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  applyBenefit?: boolean;
}
