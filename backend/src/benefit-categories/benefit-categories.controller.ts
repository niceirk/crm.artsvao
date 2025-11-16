import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { BenefitCategoriesService } from './benefit-categories.service';
import { CreateBenefitCategoryDto } from './dto/create-benefit-category.dto';
import { UpdateBenefitCategoryDto } from './dto/update-benefit-category.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('benefit-categories')
export class BenefitCategoriesController {
  constructor(private readonly benefitCategoriesService: BenefitCategoriesService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createBenefitCategoryDto: CreateBenefitCategoryDto) {
    return this.benefitCategoriesService.create(createBenefitCategoryDto);
  }

  @Get()
  findAll() {
    return this.benefitCategoriesService.findAll();
  }

  @Get('active')
  findAllActive() {
    return this.benefitCategoriesService.findAllActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.benefitCategoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateBenefitCategoryDto: UpdateBenefitCategoryDto,
  ) {
    return this.benefitCategoriesService.update(id, updateBenefitCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.benefitCategoriesService.remove(id);
  }
}
