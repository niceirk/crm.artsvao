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
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('rentals')
@UseGuards(JwtAuthGuard)
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createRentalDto: CreateRentalDto) {
    return this.rentalsService.create(createRentalDto);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string,
  ) {
    return this.rentalsService.findAll({ date, roomId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentalsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateRentalDto: UpdateRentalDto,
  ) {
    return this.rentalsService.update(id, updateRentalDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.rentalsService.remove(id);
  }
}
