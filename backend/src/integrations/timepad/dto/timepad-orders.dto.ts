import { IsOptional, IsInt, Min, Max, IsString, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO для запроса заказов */
export class GetOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Количество записей (1-250)', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Смещение для пагинации', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ description: 'Фильтр по email' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

/** Преобразованный участник для фронтенда */
export class TimepadParticipantDto {
  @ApiProperty({ description: 'ID заказа' })
  id: number;

  @ApiProperty({ description: 'Email участника' })
  email: string;

  @ApiProperty({ description: 'Имя участника (из анкеты)' })
  name: string;

  @ApiProperty({ description: 'Статус заказа' })
  status: string;

  @ApiProperty({ description: 'Статус заказа (отображаемый)' })
  statusTitle: string;

  @ApiProperty({ description: 'Дата регистрации' })
  createdAt: string;

  @ApiProperty({ description: 'Оплачено' })
  isPaid: boolean;

  @ApiProperty({ description: 'Сумма оплаты' })
  paymentAmount: string | null;

  @ApiProperty({ description: 'Билеты участника' })
  tickets: TimepadTicketDto[];
}

export class TimepadTicketDto {
  @ApiProperty({ description: 'ID билета' })
  id: number;

  @ApiProperty({ description: 'Номер билета' })
  number: string;

  @ApiProperty({ description: 'Цена билета' })
  price: string;

  @ApiProperty({ description: 'Тип билета' })
  ticketType: string;
}

/** Ответ со списком участников */
export class TimepadParticipantsResponseDto {
  @ApiProperty({ description: 'Общее количество участников' })
  total: number;

  @ApiProperty({ description: 'Список участников', type: [TimepadParticipantDto] })
  participants: TimepadParticipantDto[];
}
