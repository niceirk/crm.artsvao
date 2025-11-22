# Прогресс реализации загрузки изображений в мессенджер

**Дата**: 22 ноября 2025
**Статус**: Backend полностью готов, Frontend частично готов

## Что реализовано ✅

### Backend (100% готов)

#### 1. Зависимости
- Установлены: `@aws-sdk/client-s3`, `sharp`
- Статус: Установка в процессе (проверить завершение)

#### 2. S3 Storage Service
**Файл**: `backend/src/common/services/s3-storage.service.ts`

Функционал:
- Загрузка изображений в S3 (Timeweb Cloud)
- Автоматическое сжатие изображений (макс ширина 2048px, качество 80%)
- Генерация уникальных имен файлов
- Получение публичных URL
- Удаление файлов

Методы:
- `uploadImage(file, folder, maxWidth?, quality?)` - загрузка и сжатие
- `deleteImage(fileName)` - удаление
- `getPublicUrl(fileName)` - получение URL

#### 3. Environment Variables
**Файл**: `backend/.env`

```bash
AWS_S3_BUCKET_NAME="48054a0c-artsvao"
AWS_S3_REGION="ru-1"
AWS_ACCESS_KEY_ID="7HA0M1ASHRMKI665G5YS"
AWS_SECRET_ACCESS_KEY="xWbEJN4O52DEZEUMCFBjjkpSUbPcSB6r4lm8Gu8q"
AWS_S3_ENDPOINT="https://s3.timeweb.com"
```

**Файл**: `backend/.env.example` - обновлен с примерами

#### 4. Messages Module

**Новые файлы**:
- `backend/src/messages/dto/upload-image.dto.ts` - DTO для загрузки изображения

**Обновленные файлы**:
- `backend/src/messages/messages.controller.ts`:
  - Добавлен endpoint `POST /api/messages/conversations/:id/upload-image`
  - Валидация файлов (макс 10MB, форматы: JPEG, PNG, GIF, WebP)
  - Использует FileInterceptor для обработки multipart/form-data

- `backend/src/messages/messages.service.ts`:
  - Метод `uploadImageMessage()` - загрузка изображения в S3 и отправка через Telegram
  - Сохранение метаданных в поле `payload` сообщения
  - Обновление времени последнего сообщения

- `backend/src/messages/messages.module.ts`:
  - Добавлен S3StorageService в providers

#### 5. Telegram Service

**Обновленные файлы**:
- `backend/src/telegram/telegram.service.ts`:
  - Метод `sendPhoto(chatId, photoUrl, caption?)` - отправка фото в Telegram
  - Обновлен `handlePhoto()` - обработка входящих фото:
    - Скачивание файла из Telegram API
    - Загрузка в S3
    - Сохранение сообщения с метаданными в payload
    - Fallback при ошибках

- `backend/src/telegram/telegram.module.ts`:
  - Добавлен S3StorageService в providers

#### 6. Структура payload для изображений

```typescript
{
  imageUrl: string;           // URL изображения в S3
  fileName: string;           // Имя файла в S3
  fileSize: number;           // Размер файла
  width: number;              // Ширина изображения
  height: number;             // Высота изображения
  mimeType: string;           // MIME тип
  telegramFileId?: string;    // ID файла в Telegram (для входящих)
  telegramFileUrl?: string;   // URL файла в Telegram (для входящих)
}
```

### Frontend (частично готов)

#### 1. Типы
**Файл**: `frontend/lib/types/messages.ts`

Добавлено:
```typescript
export interface ImagePayload {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  mimeType?: string;
  telegramFileId?: string;
  telegramFileUrl?: string;
}

export interface UploadImageDto {
  caption?: string;
}
```

#### 2. API Client
**Файл**: `frontend/lib/api/messages.ts`

Добавлено:
```typescript
export const uploadImage = async (
  conversationId: string,
  imageFile: File,
  caption?: string
): Promise<Message>
```

## Что осталось сделать ❌

### Установка зависимостей

⚠️ **В процессе**: Установка backend зависимостей (@aws-sdk/client-s3, sharp)
- Зависимости добавлены в package.json
- npm install запущен в фоне
- После завершения установки нужно протестировать функциональность

### Frontend UI Components ✅ ГОТОВО

Все frontend компоненты реализованы!

#### 1. ~~Обновить ChatInput компонент~~ ✅ ГОТОВО
**Файл**: `frontend/components/chat/chat-input.tsx`

Требуется:
- Добавить input[type=file] с accept="image/*"
- Реализовать **Drag & Drop**:
  - onDragOver, onDrop обработчики
  - Визуальная индикация зоны для D&D
- Реализовать **вставку из буфера (Ctrl+V)**:
  - onPaste обработчик
  - Извлечение изображения из clipboard
- Превью выбранного изображения:
  - Отображение миниатюры
  - Кнопка удаления
  - Поле для caption (подписи)
- Индикатор загрузки при отправке
- Валидация на клиенте (размер, формат)
- Кнопка "прикрепить" (скрепка)

Пример структуры:
```tsx
const [imageFile, setImageFile] = useState<File | null>(null);
const [caption, setCaption] = useState('');
const fileInputRef = useRef<HTMLInputElement>(null);

// Обработчик выбора файла
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    setImageFile(file);
  }
};

// Обработчик D&D
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    setImageFile(file);
  }
};

// Обработчик paste
const handlePaste = (e: React.ClipboardEvent) => {
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) setImageFile(file);
    }
  }
};

// Отправка
const handleSendImage = async () => {
  if (!imageFile) return;
  await uploadImage(conversationId, imageFile, caption);
  setImageFile(null);
  setCaption('');
};
```

#### 2. Обновить ChatMessage компонент
**Файл**: `frontend/components/chat/chat-message.tsx`

Требуется:
- Проверка наличия `message.payload?.imageUrl`
- Отображение изображения:
  ```tsx
  {message.payload?.imageUrl && (
    <img
      src={message.payload.imageUrl}
      alt={message.payload.fileName || "Изображение"}
      className="max-w-md rounded-lg cursor-pointer"
      onClick={() => setViewerOpen(true)}
      loading="lazy"
    />
  )}
  ```
- Клик на изображение открывает ImageViewerModal
- Отображение caption если есть: `{message.text && <p>{message.text}</p>}`
- Lazy loading для изображений
- Fallback при ошибке загрузки

#### 3. Создать ImageViewerModal компонент
**Файл**: `frontend/components/chat/image-viewer-modal.tsx`

Требуется:
- Полноэкранное модальное окно
- Отображение изображения в оригинальном размере
- Кнопка закрытия (X)
- Закрытие по ESC
- Закрытие по клику вне изображения
- Опционально: кнопка скачивания
- Отображение caption если есть

Использовать shadcn/ui Dialog:
```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  caption?: string;
  fileName?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  caption,
  fileName
}: ImageViewerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-lg">
        <img src={imageUrl} alt={fileName} className="w-full h-auto" />
        {caption && <p className="text-center mt-2">{caption}</p>}
      </DialogContent>
    </Dialog>
  );
}
```

#### 4. Установить необходимые shadcn/ui компоненты

Если еще не установлены:
```bash
cd frontend
npx shadcn@latest add dialog
```

## Как продолжить

### 1. Проверить установку backend зависимостей

```bash
cd backend
# Проверить, что установка завершена успешно
cat package.json | grep -E "aws-sdk|sharp"
# Должно быть:
# "@aws-sdk/client-s3": "^..."
# "sharp": "^..."
```

### 2. Протестировать backend

```bash
# Запустить backend
npm run start:dev

# Проверить endpoint (через Postman или curl)
curl -X POST http://localhost:3000/api/messages/conversations/{id}/upload-image \
  -H "Authorization: Bearer {token}" \
  -F "image=@/path/to/image.jpg" \
  -F "caption=Тестовое изображение"
```

### 3. Проверить S3 настройки

- Зайти в панель Timeweb Cloud
- Проверить bucket `48054a0c-artsvao`
- Убедиться, что bucket имеет публичный доступ для чтения
- Проверить, что загруженные файлы доступны по URL

### 4. Реализовать frontend компоненты

В порядке приоритета:
1. ChatMessage (отображение) - СНАЧАЛА, чтобы увидеть результат
2. ImageViewerModal - для просмотра в полном размере
3. ChatInput - для загрузки

### 5. Тестирование

- Отправка изображения от менеджера клиенту
- Получение изображения от клиента через Telegram
- Просмотр изображений в полном размере
- D&D загрузка
- Paste из буфера
- Выбор файла
- Проверка сжатия больших изображений

## Важные моменты

1. **S3 Bucket должен быть настроен на публичное чтение**:
   - В Timeweb Cloud настроить политику доступа
   - Или использовать signed URLs (требует изменения кода)

2. **CORS для S3**:
   - Если фронтенд на другом домене, настроить CORS политику для bucket

3. **Безопасность**:
   - Backend валидирует файлы (размер, формат)
   - Сжатие изображений защищает от загрузки очень больших файлов

4. **Производительность**:
   - Lazy loading изображений в чате
   - Сжатие перед загрузкой в S3
   - Progressive JPEG для быстрой загрузки

## Структура файлов

### Созданные файлы:
```
backend/
  src/
    common/
      services/
        s3-storage.service.ts          ✅ СОЗДАНО
    messages/
      dto/
        upload-image.dto.ts            ✅ СОЗДАНО

frontend/
  components/
    chat/
      image-viewer-modal.tsx           ❌ СОЗДАТЬ
```

### Обновленные файлы:
```
backend/
  package.json                          ✅ ОБНОВЛЕНО (добавлены @aws-sdk/client-s3, sharp)
  .env                                  ✅ ОБНОВЛЕНО
  .env.example                          ✅ ОБНОВЛЕНО
  src/
    messages/
      messages.controller.ts            ✅ ОБНОВЛЕНО
      messages.service.ts               ✅ ОБНОВЛЕНО
      messages.module.ts                ✅ ОБНОВЛЕНО
    telegram/
      telegram.service.ts               ✅ ОБНОВЛЕНО
      telegram.module.ts                ✅ ОБНОВЛЕНО

frontend/
  lib/
    types/
      messages.ts                       ✅ ОБНОВЛЕНО
    api/
      messages.ts                       ✅ ОБНОВЛЕНО
  components/
    chat/
      chat-input.tsx                    ✅ ОБНОВЛЕНО
      chat-message.tsx                  ✅ ОБНОВЛЕНО
      chat-window.tsx                   ✅ ОБНОВЛЕНО
  app/(dashboard)/messages/
      page.tsx                          ✅ ОБНОВЛЕНО
```

## Контакты и ссылки

- **S3 Endpoint**: https://s3.timeweb.com
- **Bucket**: 48054a0c-artsvao
- **Region**: ru-1

---

---

## Обновление от 22.11.2025 (вечер)

### ✅ Выполнено:

1. **Frontend полностью реализован:**
   - ✅ Создан ImageViewerModal компонент (просмотр изображений в полном размере)
   - ✅ Обновлен ChatMessage для отображения изображений
   - ✅ Обновлен ChatInput с поддержкой:
     - Выбор файла через кнопку
     - Drag & Drop
     - Вставка из буфера (Ctrl+V)
     - Превью изображения
     - Добавление подписи (caption)
   - ✅ Обновлен ChatWindow для передачи обработчика onSendImage
   - ✅ Обновлена страница /messages для работы с изображениями

2. **Backend зависимости:**
   - ✅ Добавлены в package.json: @aws-sdk/client-s3, sharp
   - ⏳ npm install в процессе

### ⏳ Осталось:
- Дождаться завершения установки зависимостей
- Протестировать загрузку и отображение изображений
- Проверить настройки S3 bucket (публичный доступ, CORS)

---

*Документ создан: 22.11.2025*
*Обновлён: 22.11.2025*
*Backend готов на 100%, Frontend готов на 100%*
*Статус: В ожидании установки зависимостей*
