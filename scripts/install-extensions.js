// ============================================================================
// Скрипт установки расширений PostgreSQL
// ============================================================================
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Подключение к БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace('sslmode=verify-full', 'sslmode=require'),
  ssl: {
    rejectUnauthorized: false
  }
});

async function installExtensions() {
  const client = await pool.connect();

  try {
    console.log('🔄 Подключение к базе данных...\n');

    // Читаем SQL скрипт
    const sqlFile = path.join(__dirname, 'sql', '001_init_extensions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Разбиваем на отдельные команды (по точке с запятой)
    const commands = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('\\echo'))
      .join('\n')
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log('📦 Установка расширений PostgreSQL...\n');

    for (const command of commands) {
      if (command.toLowerCase().includes('create extension')) {
        const match = command.match(/CREATE EXTENSION IF NOT EXISTS "?([^";]+)"?/i);
        if (match) {
          const extName = match[1];
          try {
            await client.query(command);
            console.log(`✅ ${extName} - установлено`);
          } catch (err) {
            if (err.code === '42710') { // Extension already exists
              console.log(`ℹ️  ${extName} - уже установлено`);
            } else {
              console.error(`❌ ${extName} - ошибка:`, err.message);
            }
          }
        }
      }
    }

    // Проверка установленных расширений
    console.log('\n📊 Проверка установленных расширений:\n');
    const result = await client.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin', 'btree_gist', 'unaccent', 'plpgsql')
      ORDER BY extname
    `);

    result.rows.forEach(row => {
      console.log(`  - ${row.extname.padEnd(15)} v${row.extversion}`);
    });

    console.log('\n✅ Все расширения успешно установлены!\n');

  } catch (err) {
    console.error('\n❌ Ошибка при установке расширений:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

installExtensions();
