/**
 * Данные для QR-кода оплаты в бюджетную организацию
 * по ГОСТ Р 56042-2014
 */
export interface BudgetPaymentData {
  // ========== ПОЛУЧАТЕЛЬ ==========
  /** Наименование получателя платежа */
  Name: string;

  /** ИНН получателя (10 или 12 символов) */
  PayeeINN: string;

  /** КПП получателя (9 символов) */
  KPP: string;

  /** Номер счёта получателя - казначейский счет / ЕКС (20 символов) */
  PersonalAcc: string;

  // ========== БАНК ==========
  /** Наименование банка получателя */
  BankName: string;

  /** БИК банка (9 символов) */
  BIC: string;

  /** Корреспондентский счёт / счёт банка получателя (20 символов) */
  CorrespAcc: string;

  // ========== БЮДЖЕТНЫЕ ПОЛЯ (ОБЯЗАТЕЛЬНО для госучреждений) ==========
  /** КБК - Код бюджетной классификации (от 20 до 26 символов) */
  CBC: string;

  /** ОКТМО - Общероссийский классификатор территорий (8 или 11 символов) */
  OKTMO: string;

  /** УИН - Уникальный идентификатор начисления (20 или 25 цифр, или "0" если не присвоен) */
  UIN?: string;

  // ========== ПЛАТЕЖ ==========
  /** Назначение платежа */
  Purpose: string;

  /** Сумма платежа (будет преобразована в копейки при формировании QR) */
  Sum: number;

  // ========== ПЛАТЕЛЬЩИК ==========
  /** Фамилия плательщика */
  LastName: string;

  /** Имя плательщика */
  FirstName: string;

  /** Отчество плательщика (опционально) */
  MiddleName?: string;

  // ========== ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ==========
  /** ИНН плательщика (опционально) */
  PayerINN?: string;

  /** Статус плательщика (обычно '0' для физлиц) */
  DrawerStatus?: string;

  /** Номер документа (номер счета) */
  DocNo?: string;

  /** Дата документа в формате ДДММГГГГ */
  DocDate?: string;

  /** Период оплаты в формате ММДДГГГГ */
  PaymPeriod?: string;

  /** Адрес плательщика */
  PayerAddress?: string;

  /** Телефон плательщика */
  Phone?: string;
}

/**
 * Класс для формирования строки платежных данных
 * по стандарту ГОСТ Р 56042-2014 для бюджетных организаций
 */
export class QRPaymentDataBuilder {
  /**
   * Формирование строки платежных данных по ГОСТ Р 56042-2014 (UTF-8)
   * @param data - данные платежа
   * @returns строка для кодирования в QR-код
   */
  static buildBudgetPaymentString(data: BudgetPaymentData): string {
    // Валидация перед формированием
    this.validate(data);

    const fields: string[] = ['ST00012']; // UTF-8 кодировка

    // ========== ОБЯЗАТЕЛЬНЫЕ ПОЛЯ ПОЛУЧАТЕЛЯ ==========
    fields.push(`Name=${this.escape(data.Name)}`);
    fields.push(`PersonalAcc=${data.PersonalAcc}`);
    fields.push(`BankName=${this.escape(data.BankName)}`);
    fields.push(`BIC=${data.BIC}`);
    fields.push(`CorrespAcc=${data.CorrespAcc}`);
    fields.push(`PayeeINN=${data.PayeeINN}`);
    fields.push(`KPP=${data.KPP}`);

    // ========== БЮДЖЕТНЫЕ ПОЛЯ (ОБЯЗАТЕЛЬНО) ==========
    fields.push(`CBC=${data.CBC}`); // КБК
    fields.push(`OKTMO=${data.OKTMO}`); // ОКТМО

    // УИН - если не указан, используем "0"
    if (data.UIN) {
      fields.push(`UIN=${data.UIN}`);
    } else {
      fields.push(`UIN=0`);
    }

    // ========== ПЛАТЕЖ ==========
    // Форматируем сумму с гарантией правильного формата (xxxx.xx) для всех банков
    const formattedSum = this.formatSum(data.Sum);
    fields.push(`Sum=${formattedSum}`);
    fields.push(`Purpose=${this.escape(data.Purpose)}`);

    // ========== ПЛАТЕЛЬЩИК ==========
    fields.push(`LastName=${this.escape(data.LastName)}`);
    fields.push(`FirstName=${this.escape(data.FirstName)}`);
    if (data.MiddleName) {
      fields.push(`MiddleName=${this.escape(data.MiddleName)}`);
    }

    // ========== ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ==========
    if (data.PayerINN) {
      fields.push(`PayerINN=${data.PayerINN}`);
    }

    if (data.DrawerStatus) {
      fields.push(`DrawerStatus=${data.DrawerStatus}`);
    }

    if (data.DocNo) {
      fields.push(`DocNo=${this.escape(data.DocNo)}`);
    }

    if (data.DocDate) {
      fields.push(`DocDate=${data.DocDate}`);
    }

    if (data.PaymPeriod) {
      fields.push(`PaymPeriod=${data.PaymPeriod}`);
    }

    if (data.PayerAddress) {
      fields.push(`PayerAddress=${this.escape(data.PayerAddress)}`);
    }

    if (data.Phone) {
      fields.push(`Phone=${this.escape(data.Phone)}`);
    }

    return fields.join('|');
  }

  /**
   * Форматирование суммы для QR-кода
   * ВАЖНО: Сбербанк ожидает сумму В КОПЕЙКАХ как целое число
   * Тинькофф обрабатывает оба формата, но Сбербанк строже
   * @param sum - сумма в рублях
   * @returns сумма в копейках как целое число (строка)
   */
  private static formatSum(sum: number): string {
    // Преобразуем рубли в копейки (умножаем на 100 и округляем)
    const kopecks = Math.round(sum * 100);

    // Возвращаем целое число копеек как строку
    return kopecks.toString();
  }

  /**
   * Экранирование спецсимволов в строковых значениях
   * @param value - исходная строка
   * @returns экранированная строка
   */
  private static escape(value: string): string {
    if (!value) return '';

    return (
      value
        .replace(/\|/g, '') // Убираем pipe (разделитель полей)
        .replace(/\n/g, ' ') // Заменяем переносы строк на пробелы
        .replace(/\r/g, '') // Убираем возврат каретки
        .replace(/\s+/g, ' ') // Заменяем множественные пробелы на одинарные
        .trim()
    );
  }

  /**
   * Валидация данных перед генерацией QR-кода
   * @param data - данные для валидации
   * @throws Error если данные невалидны
   */
  static validate(data: BudgetPaymentData): void {
    // ========== ПОЛУЧАТЕЛЬ ==========
    if (!data.Name || data.Name.trim().length === 0) {
      throw new Error('Наименование получателя (Name) обязательно');
    }

    if (!data.PayeeINN || !/^\d{10}$|^\d{12}$/.test(data.PayeeINN)) {
      throw new Error('ИНН получателя (PayeeINN) должен быть 10 или 12 цифр');
    }

    if (!data.KPP || !/^\d{9}$/.test(data.KPP)) {
      throw new Error('КПП получателя (KPP) должен быть 9 цифр');
    }

    if (!data.PersonalAcc || !/^\d{20}$/.test(data.PersonalAcc)) {
      throw new Error(
        'Номер счёта получателя (PersonalAcc) должен быть 20 цифр',
      );
    }

    // ========== БАНК ==========
    if (!data.BankName || data.BankName.trim().length === 0) {
      throw new Error('Наименование банка (BankName) обязательно');
    }

    if (!data.BIC || !/^\d{9}$/.test(data.BIC)) {
      throw new Error('БИК банка (BIC) должен быть 9 цифр');
    }

    if (!data.CorrespAcc || !/^\d{20}$/.test(data.CorrespAcc)) {
      throw new Error(
        'Корреспондентский счёт (CorrespAcc) должен быть 20 цифр',
      );
    }

    // ========== БЮДЖЕТНЫЕ ПОЛЯ ==========
    if (!data.CBC || !/^\d{20,26}$/.test(data.CBC)) {
      throw new Error('КБК (CBC) должен быть от 20 до 26 цифр');
    }

    if (!data.OKTMO || !/^\d{8}$|^\d{11}$/.test(data.OKTMO)) {
      throw new Error('ОКТМО (OKTMO) должен быть 8 или 11 цифр');
    }

    // ========== ПЛАТЕЖ ==========
    if (!data.Purpose || data.Purpose.trim().length === 0) {
      throw new Error('Назначение платежа (Purpose) обязательно');
    }

    if (!data.Sum || data.Sum <= 0) {
      throw new Error('Сумма платежа (Sum) должна быть больше 0');
    }

    if (data.Sum > 999999999.99) {
      throw new Error('Сумма платежа (Sum) слишком велика');
    }

    // ========== ПЛАТЕЛЬЩИК ==========
    if (!data.LastName || data.LastName.trim().length === 0) {
      throw new Error('Фамилия плательщика (LastName) обязательна');
    }

    if (!data.FirstName || data.FirstName.trim().length === 0) {
      throw new Error('Имя плательщика (FirstName) обязательно');
    }

    // ========== ОПЦИОНАЛЬНЫЕ ПОЛЯ ==========
    if (data.PayerINN && !/^\d{10}$|^\d{12}$/.test(data.PayerINN)) {
      throw new Error('ИНН плательщика (PayerINN) должен быть 10 или 12 цифр');
    }

    if (data.DocDate && !/^\d{8}$/.test(data.DocDate)) {
      throw new Error('Дата документа (DocDate) должна быть в формате ДДММГГГГ');
    }

    if (data.PaymPeriod && !/^\d{8}$/.test(data.PaymPeriod)) {
      throw new Error('Период оплаты (PaymPeriod) должен быть в формате ММДДГГГГ');
    }
  }

  /**
   * Форматирование даты в формат ДДММГГГГ для поля DocDate
   * @param date - объект Date
   * @returns строка в формате ДДММГГГГ
   */
  static formatDocDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }

  /**
   * Форматирование даты в формат ММДДГГГГ для поля PaymPeriod
   * @param date - объект Date
   * @returns строка в формате ММДДГГГГ
   */
  static formatPaymPeriod(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${day}${year}`;
  }
}
