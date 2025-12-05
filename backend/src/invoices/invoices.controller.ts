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
  Request,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EmailService } from '../email/email.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createInvoiceDto: CreateInvoiceDto, @Request() req) {
    return this.invoicesService.create(createInvoiceDto, req.user.sub);
  }

  @Get()
  findAll(@Query() filter: InvoiceFilterDto) {
    return this.invoicesService.findAll(filter);
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.invoicesService.findByClient(clientId);
  }

  /**
   * Получить QR-код для оплаты счета (PNG изображение)
   */
  @Get(':id/qr')
  @Header('Content-Type', 'image/png')
  async getQRCode(@Param('id') id: string, @Res() res: Response) {
    const { buffer } = await this.invoicesService.generateQRCode(id);
    res.send(buffer);
  }

  /**
   * Получить QR-код как Data URL (для встраивания в HTML)
   */
  @Get(':id/qr-data-url')
  async getQRDataURL(@Param('id') id: string) {
    const { dataUrl, paymentData, paymentString } = await this.invoicesService.generateQRCode(id);
    return {
      dataUrl,
      paymentData,
      paymentString,
    };
  }

  /**
   * Отправить QR-код на email клиента
   */
  @Post(':id/send-qr-email')
  @UseGuards(AdminGuard)
  async sendQREmail(@Param('id') id: string) {
    // Получаем счет
    const invoice = await this.invoicesService.findOne(id);

    if (!invoice.client.email) {
      return {
        success: false,
        message: 'У клиента не указан email адрес',
      };
    }

    // Генерируем QR-код
    const { dataUrl, paymentData } = await this.invoicesService.generateQRCode(id);

    // Формируем имя клиента
    const clientName = `${invoice.client.firstName} ${invoice.client.lastName}`;

    // Вычисляем процент скидки, если есть льготная категория
    let discountPercent = 0;
    if (invoice.client.benefitCategory) {
      discountPercent = Number(invoice.client.benefitCategory.discountPercent);
    }

    try {
      // Отправляем email с QR-кодом
      await this.emailService.sendInvoiceQRCode(
        invoice.client.email,
        clientName,
        invoice.invoiceNumber,
        Number(invoice.totalAmount),
        dataUrl,
        paymentData.Purpose, // Назначение платежа из QR-кода
        Number(invoice.discountAmount), // Сумма скидки
        discountPercent, // Процент скидки (если есть)
      );

      return {
        success: true,
        message: `Email с QR-кодом отправлен на ${invoice.client.email}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Не удалось отправить email. Попробуйте позже.',
      };
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post(':id/mark-paid')
  @UseGuards(AdminGuard)
  markAsPaid(@Param('id') id: string, @Request() req) {
    return this.invoicesService.markAsPaid(id, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Request() req,
  ) {
    return this.invoicesService.update(id, updateInvoiceDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.invoicesService.delete(id, req.user.email);
  }
}
