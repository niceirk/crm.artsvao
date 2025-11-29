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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { ToggleNotificationsDto } from './dto/toggle-notifications.dto';
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

  @Delete(':id/telegram-accounts/:accountId')
  unlinkTelegramAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Request() req,
  ) {
    return this.clientsService.unlinkTelegramAccount(id, accountId, req.user.id);
  }

  @Patch(':id/telegram-accounts/:accountId/notifications')
  toggleNotifications(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body() dto: ToggleNotificationsDto,
    @Request() req,
  ) {
    return this.clientsService.toggleNotifications(id, accountId, dto.enabled, req.user.id);
  }

  /**
   * POST /clients/:id/photo - загрузить фото клиента
   */
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Недопустимый тип файла. Разрешены: JPEG, PNG, GIF, WEBP');
    }
    return this.clientsService.uploadPhoto(id, file, req.user.id);
  }

  /**
   * DELETE /clients/:id/photo - удалить фото клиента
   */
  @Delete(':id/photo')
  deletePhoto(@Param('id') id: string, @Request() req) {
    return this.clientsService.deletePhoto(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.clientsService.remove(id, req.user.id);
  }
}
