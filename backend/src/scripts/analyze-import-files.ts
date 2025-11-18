import * as XLSX from 'xlsx';
import * as path from 'path';

/**
 * Анализ структуры файлов импорта
 */

const IMPORT_DIR = path.join(__dirname, '../../../import');

function analyzeExcelFile(filePath: string, fileName: string) {
  console.log(`\n========================================`);
  console.log(`Файл: ${fileName}`);
  console.log(`========================================`);

  try {
    // Читаем файл
    const workbook = XLSX.readFile(filePath);

    // Получаем первый лист
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Конвертируем в JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    console.log(`Название листа: ${sheetName}`);
    console.log(`Всего строк: ${data.length}`);

    if (data.length > 0) {
      // Показываем колонки
      const columns = Object.keys(data[0]);
      console.log(`\nКолонки (${columns.length}):`);
      columns.forEach((col, idx) => {
        console.log(`  ${idx + 1}. ${col}`);
      });

      // Показываем первые 3 строки как примеры
      console.log(`\nПримеры данных (первые 3 строки):`);
      data.slice(0, 3).forEach((row: any, idx) => {
        console.log(`\nСтрока ${idx + 1}:`);
        columns.forEach(col => {
          let value = row[col];
          // Ограничиваем длину значения для читаемости
          if (typeof value === 'string' && value.length > 50) {
            value = value.substring(0, 50) + '...';
          }
          console.log(`  ${col}: ${value}`);
        });
      });

      // Анализ пустых значений
      console.log(`\nАнализ пустых значений:`);
      const emptyStats = {};
      columns.forEach(col => {
        const emptyCount = data.filter((row: any) => !row[col] || row[col] === null || row[col] === '').length;
        emptyStats[col] = {
          empty: emptyCount,
          filled: data.length - emptyCount,
          percentage: ((emptyCount / data.length) * 100).toFixed(1) + '%'
        };
      });

      columns.forEach(col => {
        const stats = emptyStats[col];
        console.log(`  ${col}: ${stats.filled} заполнено, ${stats.empty} пусто (${stats.percentage})`);
      });
    } else {
      console.log('Файл пуст!');
    }

  } catch (error) {
    console.error(`Ошибка при чтении файла: ${error.message}`);
  }
}

async function main() {
  console.log('===========================================');
  console.log('АНАЛИЗ ФАЙЛОВ ИМПОРТА');
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
