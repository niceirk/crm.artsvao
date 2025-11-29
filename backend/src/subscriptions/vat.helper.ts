import { Decimal } from '@prisma/client/runtime/library';

/**
 * Хелпер для работы с НДС
 *
 * Логика:
 * 1. Базовая ставка НДС определяется категорией услуги
 * 2. Для несовершеннолетних клиентов НДС = 0% (независимо от категории)
 * 3. Ставка может быть переопределена на уровне конкретной услуги
 */
export class VatHelper {
  /**
   * Проверяет, является ли клиент совершеннолетним
   */
  static isAdult(birthDate: Date | string | null): boolean {
    if (!birthDate) return true; // Если нет даты - считаем взрослым

    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();

    // Корректируем возраст, если день рождения ещё не наступил в этом году
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age >= 18;
  }

  /**
   * Определяет эффективную ставку НДС
   *
   * @param clientBirthDate - Дата рождения клиента
   * @param categoryVatRate - Ставка НДС категории (по умолчанию)
   * @param overrideVatRate - Переопределённая ставка (если указана)
   * @returns Эффективная ставка НДС в процентах
   */
  static getEffectiveVatRate(
    clientBirthDate: Date | string | null,
    categoryVatRate: number | Decimal,
    overrideVatRate?: number | Decimal | null,
  ): number {
    const categoryRate = typeof categoryVatRate === 'number' ? categoryVatRate : Number(categoryVatRate);

    // 1. Если клиент несовершеннолетний - НДС 0%
    if (!this.isAdult(clientBirthDate)) {
      return 0;
    }

    // 2. Если есть переопределение на уровне услуги - используем его
    if (overrideVatRate !== undefined && overrideVatRate !== null) {
      return typeof overrideVatRate === 'number' ? overrideVatRate : Number(overrideVatRate);
    }

    // 3. Иначе - ставка категории
    return categoryRate;
  }

  /**
   * Рассчитывает НДС из цены (НДС включён в цену)
   *
   * @param price - Цена с НДС
   * @param vatRate - Ставка НДС в процентах
   * @returns Объект с суммой НДС и ценой без НДС
   */
  static extractVatFromPrice(
    price: number | Decimal,
    vatRate: number | Decimal,
  ): {
    vatAmount: number;
    priceWithoutVat: number;
    priceWithVat: number;
  } {
    const priceNum = typeof price === 'number' ? price : Number(price);
    const vatRateNum = typeof vatRate === 'number' ? vatRate : Number(vatRate);

    if (vatRateNum === 0) {
      return {
        vatAmount: 0,
        priceWithoutVat: priceNum,
        priceWithVat: priceNum,
      };
    }

    // Формула: НДС = Цена * СтавкаНДС / (100 + СтавкаНДС)
    const vatAmount = (priceNum * vatRateNum) / (100 + vatRateNum);

    return {
      vatAmount: Math.round(vatAmount * 100) / 100,
      priceWithoutVat: Math.round((priceNum - vatAmount) * 100) / 100,
      priceWithVat: priceNum,
    };
  }

  /**
   * Рассчитывает НДС сверху (НДС не включён в цену)
   *
   * @param price - Цена без НДС
   * @param vatRate - Ставка НДС в процентах
   * @returns Объект с суммой НДС и итоговой ценой
   */
  static addVatToPrice(
    price: number | Decimal,
    vatRate: number | Decimal,
  ): {
    vatAmount: number;
    priceWithoutVat: number;
    priceWithVat: number;
  } {
    const priceNum = typeof price === 'number' ? price : Number(price);
    const vatRateNum = typeof vatRate === 'number' ? vatRate : Number(vatRate);

    if (vatRateNum === 0) {
      return {
        vatAmount: 0,
        priceWithoutVat: priceNum,
        priceWithVat: priceNum,
      };
    }

    // Формула: НДС = Цена * СтавкаНДС / 100
    const vatAmount = (priceNum * vatRateNum) / 100;

    return {
      vatAmount: Math.round(vatAmount * 100) / 100,
      priceWithoutVat: priceNum,
      priceWithVat: Math.round((priceNum + vatAmount) * 100) / 100,
    };
  }

  /**
   * Форматирует информацию о НДС для отображения
   *
   * @param price - Цена
   * @param vatRate - Ставка НДС
   * @param vatIncluded - НДС включён в цену (true по умолчанию)
   * @returns Строка с описанием НДС
   */
  static formatVatInfo(
    price: number | Decimal,
    vatRate: number | Decimal,
    vatIncluded: boolean = true,
  ): string {
    const priceNum = typeof price === 'number' ? price : Number(price);
    const vatRateNum = typeof vatRate === 'number' ? vatRate : Number(vatRate);

    if (vatRateNum === 0) {
      return `${priceNum.toLocaleString('ru-RU')} ₽ (без НДС)`;
    }

    if (vatIncluded) {
      const { vatAmount } = this.extractVatFromPrice(priceNum, vatRateNum);
      return `${priceNum.toLocaleString('ru-RU')} ₽ (в т.ч. НДС ${vatRateNum}%: ${vatAmount.toLocaleString('ru-RU')} ₽)`;
    } else {
      const { priceWithVat, vatAmount } = this.addVatToPrice(priceNum, vatRateNum);
      return `${priceWithVat.toLocaleString('ru-RU')} ₽ (НДС ${vatRateNum}%: ${vatAmount.toLocaleString('ru-RU')} ₽)`;
    }
  }

  /**
   * Рассчитывает НДС для продажи абонемента/разового
   *
   * @param params - Параметры для расчёта
   * @returns Объект с данными о НДС
   */
  static calculateForSale(params: {
    clientBirthDate: Date | string | null;
    totalPrice: number;
    categoryVatRate: number;
    overrideVatRate?: number | null;
    vatIncluded?: boolean;
  }): {
    effectiveVatRate: number;
    vatAmount: number;
    priceWithVat: number;
    priceWithoutVat: number;
    isChildDiscount: boolean;
  } {
    const { clientBirthDate, totalPrice, categoryVatRate, overrideVatRate, vatIncluded = true } = params;

    const isChild = !this.isAdult(clientBirthDate);
    const effectiveVatRate = this.getEffectiveVatRate(clientBirthDate, categoryVatRate, overrideVatRate);

    let result;
    if (vatIncluded) {
      result = this.extractVatFromPrice(totalPrice, effectiveVatRate);
    } else {
      result = this.addVatToPrice(totalPrice, effectiveVatRate);
    }

    return {
      effectiveVatRate,
      ...result,
      isChildDiscount: isChild && categoryVatRate > 0,
    };
  }
}
