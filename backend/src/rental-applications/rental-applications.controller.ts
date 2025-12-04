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
  Request,
} from '@nestjs/common';
import { RentalApplicationsService } from './rental-applications.service';
import {
  CreateRentalApplicationDto,
  UpdateRentalApplicationDto,
  CheckAvailabilityDto,
  CalculatePriceDto,
  ExtendRentalDto,
  CancelRentalDto,
  GetHourlyOccupancyDto,
  GetRoomMonthlyOccupancyDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RentalApplicationStatus, RentalType } from '@prisma/client';
import { AvailabilityResult, PriceCalculation } from './types';

@Controller('rental-applications')
@UseGuards(JwtAuthGuard)
export class RentalApplicationsController {
  constructor(private readonly rentalApplicationsService: RentalApplicationsService) {}

  @Post('check-availability')
  checkAvailability(@Body() dto: CheckAvailabilityDto): Promise<AvailabilityResult> {
    return this.rentalApplicationsService.checkAvailability(dto);
  }

  @Post('hourly-occupancy')
  getHourlyOccupancy(@Body() dto: GetHourlyOccupancyDto): Promise<Record<string, boolean>> {
    return this.rentalApplicationsService.getHourlyOccupancy(dto);
  }

  @Post('room-monthly-occupancy')
  getRoomMonthlyOccupancy(
    @Body() dto: GetRoomMonthlyOccupancyDto,
  ): Promise<Record<string, { type: string; description: string } | null>> {
    return this.rentalApplicationsService.getRoomMonthlyOccupancy(dto);
  }

  @Post('calculate-price')
  calculatePrice(@Body() dto: CalculatePriceDto): Promise<PriceCalculation> {
    return this.rentalApplicationsService.calculatePrice(dto);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateRentalApplicationDto, @Request() req: any) {
    return this.rentalApplicationsService.create(dto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('status') status?: RentalApplicationStatus,
    @Query('rentalType') rentalType?: RentalType,
    @Query('clientId') clientId?: string,
    @Query('roomId') roomId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.rentalApplicationsService.findAll({
      status,
      rentalType,
      clientId,
      roomId,
      startDate,
      endDate,
      search,
    });
  }

  @Get(':id/edit-status')
  getEditStatus(@Param('id') id: string) {
    return this.rentalApplicationsService.getEditStatus(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentalApplicationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRentalApplicationDto,
    @Request() req: any,
  ) {
    return this.rentalApplicationsService.update(id, dto, req.user.userId);
  }

  @Post(':id/confirm')
  @UseGuards(AdminGuard)
  confirm(@Param('id') id: string, @Request() req: any) {
    return this.rentalApplicationsService.confirm(id, req.user.userId);
  }

  @Post(':id/extend')
  @UseGuards(AdminGuard)
  extend(
    @Param('id') id: string,
    @Body() dto: ExtendRentalDto,
    @Request() req: any,
  ) {
    return this.rentalApplicationsService.extend(id, dto, req.user.userId);
  }

  @Post(':id/cancel')
  @UseGuards(AdminGuard)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelRentalDto,
    @Request() req: any,
  ) {
    return this.rentalApplicationsService.cancel(id, dto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.rentalApplicationsService.remove(id);
  }
}
