import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UserResponseDto,
  UsersFilterDto,
  CreateInviteDto,
  CreateUserDto,
  UpdateUserStatusDto,
} from './dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me - получить текущего пользователя
   */
  @Get('me')
  async getMe(@Req() req: any): Promise<UserResponseDto> {
    const userId = req.user.sub;
    return this.usersService.findById(userId);
  }

  /**
   * PATCH /users/me - обновить профиль
   */
  @Patch('me')
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const userId = req.user.sub;
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  /**
   * PATCH /users/me/password - сменить пароль
   */
  @Patch('me/password')
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  /**
   * POST /users/me/avatar - загрузить аватар
   */
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    // Проверка типа файла
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Недопустимый тип файла. Разрешены: JPEG, PNG, GIF, WEBP`);
    }

    const userId = req.user.sub;
    return this.usersService.uploadAvatar(userId, file);
  }

  /**
   * DELETE /users/me/avatar - удалить аватар
   */
  @Delete('me/avatar')
  async deleteAvatar(@Req() req: any): Promise<UserResponseDto> {
    const userId = req.user.sub;
    return this.usersService.deleteAvatar(userId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * POST /users - создать нового пользователя вручную (только для админов)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  /**
   * GET /users - получить список всех пользователей (только для админов)
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async findAll(@Query() filters: UsersFilterDto) {
    return this.usersService.findAll(filters);
  }

  /**
   * POST /users/invite - создать приглашение для нового пользователя (только для админов)
   */
  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createInvite(@Body() dto: CreateInviteDto) {
    return this.usersService.createInvite(dto);
  }

  /**
   * PATCH /users/:id/status - обновить статус пользователя (только для админов)
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateStatus(id, dto);
  }

  /**
   * DELETE /users/:id - удалить пользователя (только для админов)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user.sub;
    return this.usersService.remove(id, currentUserId);
  }
}
