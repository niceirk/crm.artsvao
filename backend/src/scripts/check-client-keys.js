const XLSX = require('xlsx');
const path = require('path');

// Читаем файл Клиенты
const clientsWb = XLSX.readFile('/mnt/d/artsvao/import/Клиенты.xlsx');
const clientsWs = clientsWb.Sheets[clientsWb.SheetNames[0]];
const clientsData = XLSX.utils.sheet_to_json(clientsWs, { header: 1, defval: null });

console.log('📋 Анализ ключей ФИО в файле Клиенты.xlsx\n');
console.log('='.repeat(80));

const headers = clientsData[5];
console.log('\nЗаголовки (строка 5):');
headers.forEach((h, i) => {
  if (h) console.log(`  [${i}] ${h}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n📋 Первые 10 клиентов артсвао.ру:\n');

let count = 0;
const refIdx = headers.indexOf('Ссылка');
const structIdx = headers.indexOf('Структурная единица');
const fullNameIdx = headers.indexOf('Полное наименование');
const firstNameIdx = headers.indexOf('Имя');
const lastNameIdx = headers.indexOf('Фамилия');
const middleNameIdx = headers.indexOf('Отчество');

for (let i = 6; i < clientsData.length && count < 10; i++) {
  const row = clientsData[i];
  const structUnit = row[structIdx];

  if (structUnit && structUnit.trim().toLowerCase() === 'артсвао.ру') {
    const ref = row[refIdx];
    const fullName = row[fullNameIdx];
    const firstName = row[firstNameIdx];
    const lastName = row[lastNameIdx];
    const middleName = row[middleNameIdx];

    console.log(`Клиент ${count + 1}:`);
    console.log(`  Ссылка: "${ref}"`);
    console.log(`  Полное наименование: "${fullName}"`);
    console.log(`  ФИО: ${lastName} ${firstName} ${middleName || ''}`);

    const keyFromRef = ref ? ref.trim().toLowerCase() : 'null';
    const keyFromName = `${lastName} ${firstName} ${middleName || ''}`.trim().toLowerCase();

    console.log(`  Ключ из Ссылки: "${keyFromRef}"`);
    console.log(`  Ключ из ФИО: "${keyFromName}"`);
    console.log(`  Ключи совпадают: ${keyFromRef === keyFromName}`);
    console.log();
    count++;
  }
}
