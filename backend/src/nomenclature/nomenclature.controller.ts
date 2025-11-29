import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NomenclatureService } from './nomenclature.service';
import { NomenclatureFilterDto } from './dto/nomenclature-filter.dto';
import { CreateSubscriptionTypeNomenclatureDto } from './dto/create-subscription-type-nomenclature.dto';
import { UpdateSubscriptionTypeNomenclatureDto } from './dto/update-subscription-type-nomenclature.dto';
import { UpdateSingleSessionDto } from './dto/update-single-session.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { CreateIndependentServiceDto } from './dto/create-independent-service.dto';
import { UpdateIndependentServiceDto } from './dto/update-independent-service.dto';

@Controller('nomenclature')
@UseGuards(JwtAuthGuard)
export class NomenclatureController {
  constructor(private readonly nomenclatureService: NomenclatureService) {}

  // =============================================
  // Получение номенклатуры (READ)
  // =============================================

  /**
   * Получить виртуальную номенклатуру услуг
   * Агрегирует данные из типов абонементов и разовых посещений
   */
  @Get()
  findAll(@Query() filter: NomenclatureFilterDto) {
    return this.nomenclatureService.findAll(filter);
  }

  /**
   * Получить статистику номенклатуры
   */
  @Get('stats')
  getStats() {
    return this.nomenclatureService.getStats();
  }

  /**
   * Получить список категорий услуг
   */
  @Get('categories')
  getCategories() {
    return this.nomenclatureService.getCategories();
  }

  // =============================================
  // CRUD для типов абонементов (SubscriptionType)
  // =============================================

  /**
   * Создать новый тип абонемента
   */
  @Post('subscription-types')
  createSubscriptionType(@Body() dto: CreateSubscriptionTypeNomenclatureDto) {
    return this.nomenclatureService.createSubscriptionType(dto);
  }

  /**
   * Обновить тип абонемента
   */
  @Patch('subscription-types/:id')
  updateSubscriptionType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionTypeNomenclatureDto,
  ) {
    return this.nomenclatureService.updateSubscriptionType(id, dto);
  }

  /**
   * Деактивировать тип абонемента (мягкое удаление)
   */
  @Delete('subscription-types/:id')
  deactivateSubscriptionType(@Param('id', ParseUUIDPipe) id: string) {
    return this.nomenclatureService.deactivateSubscriptionType(id);
  }

  // =============================================
  // CRUD для разовых посещений (через Group)
  // =============================================

  /**
   * Обновить настройки разового посещения для группы
   */
  @Patch('single-sessions')
  updateSingleSession(@Body() dto: UpdateSingleSessionDto) {
    return this.nomenclatureService.updateSingleSession(dto);
  }

  // =============================================
  // CRUD для категорий услуг (ServiceCategory)
  // =============================================

  /**
   * Создать новую категорию услуг
   */
  @Post('categories')
  createCategory(@Body() dto: CreateServiceCategoryDto) {
    return this.nomenclatureService.createCategory(dto);
  }

  /**
   * Обновить категорию услуг
   */
  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ) {
    return this.nomenclatureService.updateCategory(id, dto);
  }

  /**
   * Удалить категорию услуг
   */
  @Delete('categories/:id')
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.nomenclatureService.deleteCategory(id);
  }

  // =============================================
  // CRUD для независимых услуг (IndependentService)
  // =============================================

  /**
   * Получить список всех независимых услуг (для выбора в формах)
   */
  @Get('independent-services')
  getIndependentServicesList() {
    return this.nomenclatureService.getIndependentServicesList();
  }

  /**
   * Создать независимую услугу
   */
  @Post('independent-services')
  createIndependentService(@Body() dto: CreateIndependentServiceDto) {
    return this.nomenclatureService.createIndependentService(dto);
  }

  /**
   * Обновить независимую услугу
   */
  @Patch('independent-services/:id')
  updateIndependentService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIndependentServiceDto,
  ) {
    return this.nomenclatureService.updateIndependentService(id, dto);
  }

  /**
   * Деактивировать независимую услугу
   */
  @Delete('independent-services/:id')
  deactivateIndependentService(@Param('id', ParseUUIDPipe) id: string) {
    return this.nomenclatureService.deactivateIndependentService(id);
  }
}
