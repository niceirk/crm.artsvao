import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  virtualPhoneNumber?: string;

  @IsNumber()
  @IsOptional()
  defaultEmployeeId?: number;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
