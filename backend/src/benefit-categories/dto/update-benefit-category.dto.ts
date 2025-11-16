import { PartialType } from '@nestjs/mapped-types';
import { CreateBenefitCategoryDto } from './create-benefit-category.dto';

export class UpdateBenefitCategoryDto extends PartialType(CreateBenefitCategoryDto) {}
