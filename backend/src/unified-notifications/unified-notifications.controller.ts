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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UnifiedNotificationsService } from './unified-notifications.service';
import { NotificationQueueService } from './notification-queue.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { MassSendDto } from './dto/mass-send.dto';
import { NotificationQueryDto, TemplateQueryDto } from './dto/notification-query.dto';

@ApiTags('Unified Notifications')
@ApiBearerAuth()
@Controller('unified-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnifiedNotificationsController {
  constructor(
    private readonly notificationsService: UnifiedNotificationsService,
    private readonly queueService: NotificationQueueService,
  ) {}

  // ============================
  // УВЕДОМЛЕНИЯ
  // ============================

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Получить список уведомлений' })
  async getNotifications(@Query() query: NotificationQueryDto) {
    return this.notificationsService.getNotifications(query);
  }

  @Get('stats')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Статистика уведомлений' })
  async getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.notificationsService.getStats(dateFrom, dateTo);
  }

  @Get('queue-stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Статистика очереди уведомлений' })
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Получить уведомление по ID' })
  async getNotification(@Param('id') id: string) {
    return this.notificationsService.getNotification(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Создать уведомление в очередь' })
  async createNotification(
    @Body() dto: CreateNotificationDto,
    @Request() req: any,
  ) {
    dto.initiatorId = req.user?.id;
    return this.notificationsService.createNotification(dto);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Отменить уведомление' })
  async cancelNotification(@Param('id') id: string) {
    return this.notificationsService.cancelNotification(id);
  }

  @Post(':id/retry')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Повторить отправку уведомления' })
  async retryNotification(@Param('id') id: string) {
    return this.notificationsService.retryNotification(id);
  }

  // ============================
  // МАССОВЫЕ РАССЫЛКИ
  // ============================

  @Post('mass-send')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Создать массовую рассылку' })
  async createMassSend(@Body() dto: MassSendDto, @Request() req: any) {
    return this.notificationsService.createMassSend(dto, req.user?.id);
  }

  // ============================
  // ШАБЛОНЫ
  // ============================

  @Get('templates')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Получить список шаблонов' })
  async getTemplates(@Query() query: TemplateQueryDto) {
    return this.notificationsService.getTemplates(query);
  }

  @Get('templates/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Получить шаблон по ID' })
  async getTemplate(@Param('id') id: string) {
    return this.notificationsService.getTemplate(id);
  }

  @Post('templates')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Создать шаблон' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Patch('templates/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Обновить шаблон' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Удалить шаблон' })
  async deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  @Post('templates/:id/preview')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Предпросмотр шаблона' })
  async previewTemplate(
    @Param('id') id: string,
    @Body() sampleData: Record<string, any>,
  ) {
    return this.notificationsService.previewTemplate(id, sampleData);
  }
}
