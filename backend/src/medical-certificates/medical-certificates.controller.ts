import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicalCertificatesService } from './medical-certificates.service';
import {
  CreateMedicalCertificateDto,
  UpdateMedicalCertificateDto,
  ApplyToSchedulesDto,
  MedicalCertificateFilterDto,
  PreviewSchedulesDto,
} from './dto';

@ApiTags('Medical Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medical-certificates')
export class MedicalCertificatesController {
  constructor(private readonly service: MedicalCertificatesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать справку (файл необязателен)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        clientId: { type: 'string' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        notes: { type: 'string' },
        scheduleIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['clientId', 'startDate', 'endDate'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Поддерживаются только изображения и PDF'), false);
        }
      },
    }),
  )
  async create(
    @Body() dto: CreateMedicalCertificateDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req,
  ) {
    return this.service.create(dto, file, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список справок с фильтрацией' })
  async findAll(@Query() filter: MedicalCertificateFilterDto) {
    return this.service.findAll(filter);
  }

  @Get('available-periods')
  @ApiOperation({ summary: 'Получить доступные года и месяцы' })
  async getAvailablePeriods() {
    return this.service.getAvailablePeriods();
  }

  @Get('preview-schedules')
  @ApiOperation({ summary: 'Предпросмотр занятий клиента за период' })
  async previewSchedules(@Query() dto: PreviewSchedulesDto) {
    return this.service.previewSchedules(dto);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Получить справки клиента' })
  async findByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.service.findByClient(clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить справку по ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/schedules')
  @ApiOperation({ summary: 'Получить занятия, к которым применена справка' })
  async getAppliedSchedules(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getAppliedSchedules(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить справку' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalCertificateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Применить статус EXCUSED к занятиям' })
  async applyToSchedules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyToSchedulesDto,
    @Request() req,
  ) {
    return this.service.applyToSchedules(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить справку' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
