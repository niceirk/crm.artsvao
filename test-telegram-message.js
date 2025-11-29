/**
 * Скрипт для тестирования получения сообщений из Telegram
 * Эмулирует webhook запрос от Telegram API
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Тестовое сообщение от пользователя Telegram
const telegramUpdate = {
  update_id: Date.now(),
  message: {
    message_id: Date.now(),
    from: {
      id: 999888777, // Тестовый Telegram user ID
      is_bot: false,
      first_name: 'Тестовый',
      last_name: 'Пользователь',
      username: 'test_user_local',
      language_code: 'ru',
    },
    chat: {
      id: 999888777,
      first_name: 'Тестовый',
      last_name: 'Пользователь',
      username: 'test_user_local',
      type: 'private',
    },
    date: Math.floor(Date.now() / 1000),
    text: 'Привет! Это тестовое сообщение для проверки работы системы.',
  },
};

async function sendTestMessage() {
  try {
    console.log('📤 Отправка тестового сообщения в webhook...\n');
    console.log('Сообщение:', JSON.stringify(telegramUpdate, null, 2));
    console.log('\n---\n');

    const response = await axios.post(
      `${API_URL}/telegram/webhook`,
      telegramUpdate,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Ответ от сервера:', response.data);
    console.log('\n📱 Проверьте страницу сообщений: http://172.19.108.104:3001/messages');
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n💡 Возможно, нужно добавить TELEGRAM_BOT_TOKEN в .env файл');
    }
  }
}

// Поддержка разных типов сообщений
const messageTypes = {
  text: (text) => ({
    ...telegramUpdate,
    update_id: Date.now(),
    message: {
      ...telegramUpdate.message,
      message_id: Date.now(),
      date: Math.floor(Date.now() / 1000),
      text: text,
    },
  }),

  start: () => ({
    ...telegramUpdate,
    update_id: Date.now(),
    message: {
      ...telegramUpdate.message,
      message_id: Date.now(),
      date: Math.floor(Date.now() / 1000),
      text: '/start',
    },
  }),

  contact: (phone, firstName, lastName) => ({
    ...telegramUpdate,
    update_id: Date.now(),
    message: {
      ...telegramUpdate.message,
      message_id: Date.now(),
      date: Math.floor(Date.now() / 1000),
      contact: {
        phone_number: phone,
        first_name: firstName,
        last_name: lastName,
        user_id: telegramUpdate.message.from.id,
      },
    },
  }),
};

// Запуск
const args = process.argv.slice(2);
const command = args[0];

if (command === 'start') {
  axios
    .post(`${API_URL}/telegram/webhook`, messageTypes.start())
    .then((r) => console.log('✅ /start отправлен:', r.data))
    .catch((e) => console.error('❌ Ошибка:', e.response?.data || e.message));
} else if (command === 'contact') {
  const phone = args[1] || '+79991234567';
  const firstName = args[2] || 'Иван';
  const lastName = args[3] || 'Иванов';
  axios
    .post(`${API_URL}/telegram/webhook`, messageTypes.contact(phone, firstName, lastName))
    .then((r) => console.log('✅ Контакт отправлен:', r.data))
    .catch((e) => console.error('❌ Ошибка:', e.response?.data || e.message));
} else if (command === 'text') {
  const text = args.slice(1).join(' ') || 'Тестовое сообщение';
  axios
    .post(`${API_URL}/telegram/webhook`, messageTypes.text(text))
    .then((r) => console.log('✅ Сообщение отправлено:', r.data))
    .catch((e) => console.error('❌ Ошибка:', e.response?.data || e.message));
} else {
  sendTestMessage();
}
