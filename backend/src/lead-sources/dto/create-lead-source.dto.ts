import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateLeadSourceDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
