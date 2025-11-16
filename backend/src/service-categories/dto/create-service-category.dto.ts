import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  @MinLength(1, { message: 'Название не может быть пустым' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
