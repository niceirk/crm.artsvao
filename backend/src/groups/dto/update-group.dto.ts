import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания
}
