import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SubscriptionsService } from './subscriptions.service';
import { SellSubscriptionDto } from './dto/sell-subscription.dto';
import { SellSingleSessionDto } from './dto/sell-single-session.dto';
import { SellIndependentServiceDto } from './dto/sell-independent-service.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('sell')
  async sellSubscription(
    @Body() sellDto: SellSubscriptionDto,
    @Req() req: any,
  ) {
    const managerId = req.user?.sub;
    return this.subscriptionsService.sellSubscription(sellDto, managerId);
  }

  @Post('sell-single-session')
  async sellSingleSession(
    @Body() dto: SellSingleSessionDto,
    @Req() req: any,
  ) {
    const managerId = req.user?.sub;
    return this.subscriptionsService.sellSingleSession(dto, managerId);
  }

  @Post('sell-service')
  async sellIndependentService(
    @Body() dto: SellIndependentServiceDto,
    @Req() req: any,
  ) {
    const managerId = req.user?.sub;
    return this.subscriptionsService.sellIndependentService(dto, managerId);
  }

  @Get()
  findAll(@Query() filter: SubscriptionFilterDto) {
    return this.subscriptionsService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(id, updateDto);
  }

  @Post(':id/validate')
  async validateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('date') date: string,
  ) {
    const validationDate = date ? new Date(date) : new Date();
    return this.subscriptionsService.validateSubscription(id, validationDate);
  }

  @Get(':id/can-delete')
  canDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.canDelete(id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.remove(id);
  }
}
