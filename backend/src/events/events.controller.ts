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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SyncEventsDto, SyncResult } from './dto/sync-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('eventTypeId') eventTypeId?: string,
  ) {
    return this.eventsService.findAll({ date, status, eventTypeId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post('sync')
  @UseGuards(AdminGuard)
  async syncEvents(@Body(ValidationPipe) syncEventsDto: SyncEventsDto): Promise<SyncResult> {
    return this.eventsService.syncEvents(syncEventsDto.eventIds);
  }

  /**
   * POST /events/:id/photo - загрузить фото события
   */
  @Post(':id/photo')
  @UseGuards(AdminGuard)
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
  ) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Недопустимый тип файла. Разрешены: JPEG, PNG, GIF, WEBP');
    }
    return this.eventsService.uploadPhoto(id, file);
  }

  /**
   * DELETE /events/:id/photo - удалить фото события
   */
  @Delete(':id/photo')
  @UseGuards(AdminGuard)
  deletePhoto(@Param('id') id: string) {
    return this.eventsService.deletePhoto(id);
  }
}
