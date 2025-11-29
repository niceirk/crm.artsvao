import { IsString, IsOptional, IsNumber } from 'class-validator';

export class InitiateCallDto {
  @IsString()
  toNumber: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsNumber()
  @IsOptional()
  employeeId?: number;
}
