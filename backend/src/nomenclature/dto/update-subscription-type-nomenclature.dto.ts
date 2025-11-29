import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionTypeNomenclatureDto } from './create-subscription-type-nomenclature.dto';

export class UpdateSubscriptionTypeNomenclatureDto extends PartialType(CreateSubscriptionTypeNomenclatureDto) {}
