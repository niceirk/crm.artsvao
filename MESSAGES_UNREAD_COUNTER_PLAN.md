# План: реальное время для счетчика новых сообщений

Цель: показывать и обновлять в навигации количество новых входящих сообщений без перезагрузки, сразу после поступления сообщения из Telegram или других источников.

## Архитектура
- Транспорт: Server-Sent Events (SSE) от backend → frontend. Без socket.io, минимальные зависимости, хорошо подходит для read-only пуша.
- Ответственность:
  - Backend `messages`: считать непрочитанные (INBOUND + `isReadByManager = false`), слать события `unread-count` и `new-message`.
  - Frontend: глобальный хук подписки + Zustand-стор; Sidebar/MobileSidebar берут значение из стора и рисуют бейдж возле пункта “Сообщения”.
- Fallback: если SSE не подключился, периодический REST-поллинг `GET /messages/unread-count`.

## Требования к функционалу
- Счётчик в навигации обновляется сразу после входящего сообщения.
- При открытии диалога и успешном `mark-read` счётчик обнуляется для этого диалога и обновляется в навигации.
- Звук уведомления при новом входящем (файл из ТЗ, кладём в `frontend/public/sounds/new-message.*`), с уважением к автоплею (нужен первый user gesture).
- Без влияния на существующий 5-сек поллинг истории диалога (можно оптимизировать позже, используя те же события).

## Backend (NestJS)
- [ ] Сервис событий `MessagesEventsService` (RxJS Subject/Observable) в `backend/src/messages`:
  - `emitUnreadCount(count: number)`
  - `emitNewMessage(conversationId: string, createdAt: Date)`
  - `getEventsStream(): Observable<ServerSentEvent>`
- [ ] Контроллер:
  - `GET /messages/unread-count` → `{ count: number }`
  - `GET /messages/stream` (SSE, RolesGuard + JWT): шлёт `event: unread-count` / `event: new-message`
- [ ] Включить RolesGuard + глобальный JwtAuthGuard для SSE ручки.
- [ ] Вызовы эмита:
  - После сохранения входящего текста/фото/документа в `telegram.service.ts`
  - После `markMessagesAsRead`
  - (Опционально) после `updateConversationStatus` если логика меняет unread
- [ ] Подсчёт `unread`: `INBOUND` + `isReadByManager = false` (возможный фильтр по статусу OPEN — уточнить, сейчас считаем все).

## Frontend (Next.js)
- [ ] Новый Zustand-стор `useMessagesStore`:
  - `unreadCount: number`
  - `lastIncomingAt?: string`
  - `lastIncomingConversationId?: string`
  - setters для обновления и опционального мьюта звука.
- [ ] API-клиент `getUnreadMessagesCount` (REST) и SSE инициализация (`/api/messages/stream`, с Bearer токеном).
- [ ] Хук `useMessagesNotifications`:
  - Поднимает SSE подписку при монтировании в `(dashboard)/layout`
  - Обработчики событий → обновление стора
  - Fallback-поллинг `getUnreadMessagesCount` если SSE упал (экспоненциальный бэкофф для переподключения)
  - Проигрывает звук при `new-message` (если разрешено пользователем/было взаимодействие)
- [ ] Sidebar/MobileSidebar:
  - Для пункта `/messages` показывать бейдж из `useMessagesStore.unreadCount` (кап `99+`, скрывать при 0)
  - Не трогать статический `badge` в `navigationConfig`
- [ ] Сообщения страница:
  - Текущий поллинг 5с оставить
  - При входе в диалог и `markAsRead` обновлять стор `unreadCount` (без полного рефетча)

## Звук уведомления
- [ ] Добавить файл из ТЗ в `frontend/public/sounds/new-message.*`
- [ ] В хук добавить `Audio` instance, `play()` на `new-message` если:
  - Пользователь взаимодействовал (первая кнопка/клик)
  - Включен звук (флаг в сторе, по умолчанию true)
- [ ] Не играть звук, если пользователь уже в открытом диалоге и видит это сообщение (опционально: сверить `conversationId`).

## Проверки и тесты
- [ ] Юнит: сервис подсчёта unread (INBOUND/flags)
- [ ] Ручной сценарий:
  - Запустить бэкенд+фронт
  - Послать входящее через `test-telegram-message.js`
  - Увидеть рост счётчика в сайдбаре + звук
  - Открыть диалог, `mark-read` → счётчик 0
- [ ] Логи/стабильность: SSE переподключается, нет падения при разрыве сети.

## Открытые вопросы
- Нужно ли исключать закрытые диалоги из счётчика?
- Нужно ли на клиенте показывать всплывающий тост/баннер при новом сообщении, если пользователь не на странице сообщений?
- Полностью убирать 5-сек поллинг истории в пользу SSE для открытого диалога?

## Дальнейшие улучшения (после MVP)
- Событие `message-read` для мгновенного обнуления без доп. запросов.
- Тосты/баннеры “Новое сообщение от …” вне страницы сообщений.
- Web Push в будущем при авторизации в браузере.
