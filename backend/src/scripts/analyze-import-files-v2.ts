import * as XLSX from 'xlsx';
import * as path from 'path';

/**
 * Улучшенный анализ файлов импорта (обработка экспорта из 1С)
 */

const IMPORT_DIR = path.join(__dirname, '../../../import');

function analyzeExcelFile(filePath: string, fileName: string) {
  console.log(`\n========================================`);
  console.log(`Файл: ${fileName}`);
  console.log(`========================================`);

  try {
    // Читаем файл
    const workbook = XLSX.readFile(filePath, { cellDates: true });

    // Получаем первый лист
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Конвертируем в массив массивов (сырые данные)
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    console.log(`Название листа: ${sheetName}`);
    console.log(`Всего строк (включая служебные): ${rawData.length}`);

    // Ищем строку с заголовками (обычно после служебных строк)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      // Проверяем, содержит ли строка непустые значения в нескольких колонках
      const nonEmptyCells = row.filter(cell => cell !== null && cell !== '' && cell !== undefined);

      // Если это первая строка с большим количеством заполненных ячеек, считаем её заголовками
      if (nonEmptyCells.length > 3 && !String(row[0] || '').includes('Параметры')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.log('Не удалось найти строку с заголовками!');
      console.log('\nПервые 10 строк:');
      rawData.slice(0, 10).forEach((row, idx) => {
        console.log(`Строка ${idx}: ${row.slice(0, 5).join(' | ')}`);
      });
      return;
    }

    console.log(`Строка с заголовками: ${headerRowIndex + 1}`);
    console.log(`Пропущено служебных строк: ${headerRowIndex}`);

    const headers = rawData[headerRowIndex];
    const dataRows = rawData.slice(headerRowIndex + 1);

    console.log(`\nКолонки (${headers.length}):`);
    headers.forEach((header, idx) => {
      if (header) {
        console.log(`  ${idx + 1}. ${header}`);
      }
    });

    console.log(`\nВсего строк с данными: ${dataRows.length}`);

    // Показываем первые 3 строки данных
    console.log(`\nПримеры данных (первые 3 строки):`);
    dataRows.slice(0, 3).forEach((row, idx) => {
      console.log(`\nСтрока ${idx + 1}:`);
      headers.forEach((header, colIdx) => {
        if (header) {
          let value = row[colIdx];
          // Форматируем даты
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          }
          // Ограничиваем длину
          if (typeof value === 'string' && value.length > 60) {
            value = value.substring(0, 60) + '...';
          }
          console.log(`  ${header}: ${value}`);
        }
      });
    });

    // Статистика по заполненности
    console.log(`\nСтатистика заполненности:`);
    headers.forEach((header, colIdx) => {
      if (header) {
        const filled = dataRows.filter(row => {
          const val = row[colIdx];
          return val !== null && val !== '' && val !== undefined;
        }).length;
        const percentage = ((filled / dataRows.length) * 100).toFixed(1);
        console.log(`  ${header}: ${filled}/${dataRows.length} (${percentage}%)`);
      }
    });

  } catch (error) {
    console.error(`Ошибка при чтении файла: ${error.message}`);
  }
}

async function main() {
  console.log('===========================================');
  console.log('УЛУЧШЕННЫЙ АНАЛИЗ ФАЙЛОВ ИМПОРТА');
  console.log('===========================================');

  const files = [
    { path: path.join(IMPORT_DIR, 'Клиенты.xlsx'), name: 'Клиенты.xlsx' },
    { path: path.join(IMPORT_DIR, 'СНИЛС.xlsx'), name: 'СНИЛС.xlsx' },
    { path: path.join(IMPORT_DIR, 'Адреса.xlsx'), name: 'Адреса.xlsx' },
  ];

  for (const file of files) {
    analyzeExcelFile(file.path, file.name);
  }

  console.log('\n===========================================');
  console.log('АНАЛИЗ ЗАВЕРШЕН');
  console.log('===========================================\n');
}

main().catch(console.error);
