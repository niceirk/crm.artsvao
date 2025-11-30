import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionTypeDto } from './create-subscription-type.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateSubscriptionTypeDto extends PartialType(CreateSubscriptionTypeDto) {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания
}
