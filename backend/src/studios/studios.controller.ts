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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StudiosService } from './studios.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('studios')
@UseGuards(JwtAuthGuard)
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createStudioDto: CreateStudioDto) {
    return this.studiosService.create(createStudioDto);
  }

  @Get()
  findAll() {
    return this.studiosService.findAll();
  }

  @Get(':id/groups')
  getStudioGroups(@Param('id') id: string) {
    return this.studiosService.getStudioGroups(id);
  }

  @Get(':id/subscription-types')
  getStudioSubscriptionTypes(@Param('id') id: string) {
    return this.studiosService.getStudioSubscriptionTypes(id);
  }

  @Get(':id/stats')
  getStudioStats(@Param('id') id: string) {
    return this.studiosService.getStudioStats(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studiosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateStudioDto: UpdateStudioDto,
  ) {
    return this.studiosService.update(id, updateStudioDto);
  }

  /**
   * POST /studios/:id/photo - загрузить фото студии
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
    return this.studiosService.uploadPhoto(id, file);
  }

  /**
   * DELETE /studios/:id/photo - удалить фото студии
   */
  @Delete(':id/photo')
  @UseGuards(AdminGuard)
  deletePhoto(@Param('id') id: string) {
    return this.studiosService.deletePhoto(id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.studiosService.remove(id);
  }
}
