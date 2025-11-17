import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SubscriptionTypesService } from './subscription-types.service';
import { CreateSubscriptionTypeDto } from './dto/create-subscription-type.dto';
import { UpdateSubscriptionTypeDto } from './dto/update-subscription-type.dto';
import { SubscriptionTypeFilterDto } from './dto/subscription-type-filter.dto';

@Controller('subscription-types')
@UseGuards(JwtAuthGuard)
export class SubscriptionTypesController {
  constructor(
    private readonly subscriptionTypesService: SubscriptionTypesService,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createDto: CreateSubscriptionTypeDto) {
    return this.subscriptionTypesService.create(createDto);
  }

  @Get()
  findAll(@Query() filter: SubscriptionTypeFilterDto) {
    return this.subscriptionTypesService.findAll(filter);
  }

  @Get('by-group/:groupId')
  findAllByGroup(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.subscriptionTypesService.findAllByGroup(groupId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionTypesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSubscriptionTypeDto,
  ) {
    return this.subscriptionTypesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionTypesService.remove(id);
  }
}
