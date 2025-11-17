import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionTypeDto } from './create-subscription-type.dto';

export class UpdateSubscriptionTypeDto extends PartialType(CreateSubscriptionTypeDto) {}
