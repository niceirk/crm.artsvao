import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания
}
