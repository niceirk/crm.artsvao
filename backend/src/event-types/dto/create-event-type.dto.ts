import { IsString, IsOptional } from 'class-validator';

export class CreateEventTypeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
