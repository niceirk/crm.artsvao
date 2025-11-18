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
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @Body(ValidationPipe) createClientDto: CreateClientDto,
    @Request() req,
  ) {
    return this.clientsService.create(createClientDto, req.user.id);
  }

  @Get()
  findAll(@Query(ValidationPipe) filterDto: ClientFilterDto) {
    return this.clientsService.findAll(filterDto);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.clientsService.search(query);
  }

  @Get('check-duplicate')
  checkDuplicate(
    @Query('phone') phone: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.clientsService.checkDuplicate(phone, excludeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateClientDto: UpdateClientDto,
    @Request() req,
  ) {
    return this.clientsService.update(id, updateClientDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.clientsService.remove(id, req.user.id);
  }
}
