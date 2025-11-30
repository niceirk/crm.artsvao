import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания (опционально для внутренних вызовов)
}
