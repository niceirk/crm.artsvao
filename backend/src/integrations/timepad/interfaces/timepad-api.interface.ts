/**
 * Интерфейсы для работы с Timepad API
 * Документация: https://dev.timepad.ru/api/
 */

/** Ответ на запрос заказов события */
export interface TimepadOrdersResponse {
  total: number;
  values: TimepadOrder[];
}

/** Заказ (регистрация участника) */
export interface TimepadOrder {
  id: number;
  created_at: string;
  status: TimepadOrderStatus;
  mail: string;
  payment: TimepadPayment | null;
  tickets: TimepadTicket[];
  attendance?: boolean;
  place?: string | null;
  personal_link?: string;
  eticket_link?: string;
  subscribed_to_newsletter?: boolean;
}

/** Статус заказа */
export interface TimepadOrderStatus {
  name: string; // 'ok', 'paid', 'notpaid', 'returned', 'inactive'
  title: string; // Человекочитаемое название
}

/** Информация об оплате */
export interface TimepadPayment {
  amount: string;
  paid_at: string | null;
  payment_type: {
    name: string;
    title: string;
  };
  payment_link?: string;
}

/** Билет участника */
export interface TimepadTicket {
  id: number;
  number: string;
  price_nominal: string;
  ticket_type: {
    id: number;
    name: string;
  };
  // answers может быть объектом с полями {name, surname, mail, phone} или массивом
  answers?: TimepadAnswersObject | TimepadAnswer[];
}

/** Ответы на анкету как объект (чаще всего) */
export interface TimepadAnswersObject {
  name?: string;
  surname?: string;
  mail?: string;
  phone?: string;
  [key: string]: string | undefined;
}

/** Ответ на вопрос анкеты (альтернативный формат) */
export interface TimepadAnswer {
  field_id: string;
  value: string;
  name?: string;
}

/** Параметры запроса заказов */
export interface TimepadOrdersParams {
  limit?: number; // 1-250, по умолчанию 10
  skip?: number;  // смещение, >= 0
  email?: string; // фильтр по email
}
