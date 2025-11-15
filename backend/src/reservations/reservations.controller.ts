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
  Query,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.findAll({ date, roomId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(id);
  }
}
