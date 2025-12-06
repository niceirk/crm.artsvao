const XLSX = require('xlsx');
const path = require('path');

const EXCEL_FILE = path.join('/home/nikita/artsvao', 'Импорт.xlsx');
const workbook = XLSX.readFile(EXCEL_FILE);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

// Группируем по группам
const byGroup = {};
for (const row of rows) {
  const group = row['Группа'] || 'Без группы';
  if (!byGroup[group]) byGroup[group] = { clients: 0, subs: [] };
  byGroup[group].clients++;
  
  for (const month of ['Декабря', 'Ноябрь', 'Октябрь', 'Сентябрь']) {
    if (row[month] && row[month] > 0) {
      byGroup[group].subs.push({ client: row['ФИО'], month, price: row[month] });
    }
  }
}

console.log('ГРУППА'.padEnd(40) + ' | КЛ | АБОН | СУММА');
console.log('-'.repeat(70));
let totalClients = 0, totalSubs = 0, totalSum = 0;
for (const [group, data] of Object.entries(byGroup)) {
  const sum = data.subs.reduce((a, s) => a + s.price, 0);
  console.log(group.padEnd(40) + ' | ' + String(data.clients).padStart(2) + ' | ' + String(data.subs.length).padStart(4) + ' | ' + sum.toFixed(0).padStart(8) + ' р');
  totalClients += data.clients;
  totalSubs += data.subs.length;
  totalSum += sum;
}
console.log('-'.repeat(70));
console.log('ИТОГО'.padEnd(40) + ' | ' + String(totalClients).padStart(2) + ' | ' + String(totalSubs).padStart(4) + ' | ' + totalSum.toFixed(0).padStart(8) + ' р');
