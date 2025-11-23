import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Logger,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { GetConversationsQueryDto } from './dto/get-conversations-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { LinkConversationDto } from './dto/link-conversation.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { MessagesEventsService } from './messages-events.service';
import { merge, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('messages')
@UseGuards(RolesGuard)
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly messagesEventsService: MessagesEventsService,
  ) {}

  /**
   * Текущий счётчик непрочитанных входящих сообщений
   * GET /api/messages/unread-count
   */
  @Get('unread-count')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getUnreadCount() {
    const count = await this.messagesService.getUnreadCount();
    return { count };
  }

  /**
   * SSE поток событий для обновления счётчика в реальном времени
   * GET /api/messages/stream
   */
  @Sse('stream')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  streamMessages(): Promise<MessageEvent> | any {
    // Сразу отправляем текущее значение счётчика, затем подписываемся на события
    const initial$ = from(this.messagesService.getUnreadCount()).pipe(
      map((count) => ({
        type: 'unread-count',
        data: { type: 'unread-count', count },
      })),
    );

    return merge(initial$, this.messagesEventsService.getEventsStream());
  }

  /**
   * Получить список диалогов
   * GET /api/messages/conversations
   */
  @Get('conversations')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getConversations(@Query() query: GetConversationsQueryDto) {
    this.logger.log('Getting conversations list');
    return this.messagesService.getConversations(query);
  }

  /**
   * Получить диалог по ID с историей сообщений
   * GET /api/messages/conversations/:id
   */
  @Get('conversations/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getConversationById(@Param('id') id: string) {
    this.logger.log(`Getting conversation ${id}`);
    return this.messagesService.getConversationById(id);
  }

  /**
   * Получить новые сообщения диалога после указанной даты
   * GET /api/messages/conversations/:id/new-messages?after=<ISO date>
   */
  @Get('conversations/:id/new-messages')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getNewMessages(
    @Param('id') id: string,
    @Query('after') after?: string,
  ) {
    this.logger.log(`Getting new messages for conversation ${id} after ${after}`);
    return this.messagesService.getNewMessages(id, after);
  }

  /**
   * Отправить сообщение в диалог
   * POST /api/messages/conversations/:id/send
   */
  @Post('conversations/:id/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async sendMessage(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Sending message to conversation ${id} from user ${userId}`);
    return this.messagesService.sendMessage(id, userId, dto);
  }

  /**
   * Загрузить изображение в диалог
   * POST /api/messages/conversations/:id/upload-image
   * @param file Изображение (jpeg, png, gif, webp, макс 10MB)
   * @param caption Опциональная подпись к изображению
   */
  @Post('conversations/:id/upload-image')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UploadImageDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Проверка типа файла
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!file || !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Недопустимый формат файла. Разрешены: JPEG, PNG, GIF, WebP',
      );
    }

    const userId = req.user.sub;
    this.logger.log(
      `Uploading image to conversation ${id} from user ${userId}, size: ${file.size} bytes`,
    );

    return this.messagesService.uploadImageMessage(id, userId, file, dto.caption);
  }

  /**
   * Загрузить несколько изображений в диалог
   * POST /api/messages/conversations/:id/upload-images
   * @param files Изображения (jpeg, png, gif, webp, макс 10MB каждое, до 10 штук)
   * @param caption Опциональная подпись к изображениям
   */
  @Post('conversations/:id/upload-images')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FilesInterceptor('images', 10)) // Максимум 10 изображений
  async uploadImages(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UploadImageDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB на файл
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    // Проверка что есть хотя бы один файл
    if (!files || files.length === 0) {
      throw new BadRequestException('Необходимо загрузить хотя бы одно изображение');
    }

    // Проверка типов всех файлов
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Недопустимый формат файла ${file.originalname}. Разрешены: JPEG, PNG, GIF, WebP`,
        );
      }
    }

    const userId = req.user.sub;
    this.logger.log(
      `Uploading ${files.length} images to conversation ${id} from user ${userId}`,
    );

    return this.messagesService.uploadImagesMessage(id, userId, files, dto.caption);
  }

  /**
   * Обновить статус диалога
   * PATCH /api/messages/conversations/:id/status
   */
  @Patch('conversations/:id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateConversationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    this.logger.log(`Updating conversation ${id} status to ${dto.status}`);
    return this.messagesService.updateConversationStatus(id, dto);
  }

  /**
   * Привязать диалог к клиенту вручную
   * POST /api/messages/conversations/:id/link-client
   */
  @Post('conversations/:id/link-client')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async linkConversationToClient(
    @Param('id') id: string,
    @Body() dto: LinkConversationDto,
  ) {
    this.logger.log(`Linking conversation ${id} to client ${dto.clientId}`);
    return this.messagesService.linkConversationToClient(id, dto);
  }

  /**
   * Отметить сообщения как прочитанные
   * POST /api/messages/conversations/:id/mark-read
   */
  @Post('conversations/:id/mark-read')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async markMessagesAsRead(@Param('id') id: string) {
    this.logger.log(`Marking messages in conversation ${id} as read`);
    return this.messagesService.markMessagesAsRead(id);
  }
}
