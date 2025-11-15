# Модуль 6: Справочники

**Версия:** 1.0
**Дата:** 2025-11-13
**Статус:** В разработке

---

## Содержание

1. [Общее описание](#1-общее-описание)
2. [Структуры данных](#2-структуры-данных)
3. [API эндпоинты](#3-api-эндпоинты)
4. [Права доступа](#4-права-доступа)

---

## 1. Общее описание

### 1.1. Назначение модуля

Модуль **Справочники** обеспечивает управление базовыми справочниками системы:
- Помещения (Rooms)
- Преподаватели (Teachers)
- Льготные категории (BenefitCategories)
- Пользователи системы (Users)

Эти справочники используются во всех остальных модулях системы.

---

## 2. Структуры данных

### 2.1. Room (Помещение)

```prisma
model Room {
  id          String      @id @default(uuid())
  name        String      @db.VarChar(100)
  floor       Int?
  capacity    Int?
  area        Decimal?    @db.Decimal(6, 2)  // Площадь в кв.м
  description String?     @db.Text
  equipment   String?     @db.Text           // Оборудование
  status      RoomStatus  @default(ACTIVE)

  // Связи
  schedules   Schedule[]
  rentals     Rental[]
  individualLessons IndividualLesson[]

  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  @@map("rooms")
}

enum RoomStatus {
  ACTIVE      // Активное
  MAINTENANCE // На ремонте
  CLOSED      // Закрыто
}
```

---

### 2.2. Teacher (Преподаватель)

```prisma
model Teacher {
  id              String    @id @default(uuid())
  lastName        String    @map("last_name") @db.VarChar(100)
  firstName       String    @map("first_name") @db.VarChar(100)
  middleName      String    @map("middle_name") @db.VarChar(100)
  phone           String    @db.VarChar(20)
  email           String?   @db.VarChar(255)
  dateOfBirth     DateTime? @map("date_of_birth") @db.Date
  photoUrl        String?   @map("photo_url") @db.VarChar(500)
  bio             String?   @db.Text
  status          TeacherStatus @default(ACTIVE)

  // Связи
  studioTeachers  StudioTeacher[]
  schedules       Schedule[]
  individualLessons IndividualLesson[]

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("teachers")
}

enum TeacherStatus {
  ACTIVE      // Активный
  ON_LEAVE    // В отпуске
  DISMISSED   // Уволен
}
```

---

### 2.3. BenefitCategory (Льготная категория)

```prisma
model BenefitCategory {
  id                  String    @id @default(uuid())
  name                String    @db.VarChar(100)
  discountPercentage  Decimal   @map("discount_percentage") @db.Decimal(5, 2)
  description         String?   @db.Text

  // Связи
  clients             Client[]

  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  @@map("benefit_categories")
}
```

---

### 2.4. User (Пользователь системы)

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique @db.VarChar(255)
  passwordHash    String    @map("password_hash") @db.VarChar(255)
  lastName        String    @map("last_name") @db.VarChar(100)
  firstName       String    @map("first_name") @db.VarChar(100)
  middleName      String?   @map("middle_name") @db.VarChar(100)
  phone           String?   @db.VarChar(20)
  role            UserRole  @default(MANAGER)
  status          UserStatus @default(ACTIVE)

  // Связи
  rentals         Rental[]  @relation("ManagerRentals")

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

enum UserRole {
  ADMIN       // Администратор (полный доступ)
  MANAGER     // Менеджер/Регистратор
}

enum UserStatus {
  ACTIVE      // Активный
  BLOCKED     // Заблокирован
}
```

---

## 3. API эндпоинты

### 3.1. Помещения (Rooms)

#### `GET /api/rooms`
Получить список помещений.

**Query параметры:**
- `status` (optional): `ACTIVE` | `MAINTENANCE` | `CLOSED`

**Response 200:**
```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "Зал 1",
      "floor": 1,
      "capacity": 20,
      "area": 50.00,
      "description": "Большой зал для танцев",
      "equipment": "Зеркала, станки, аудиосистема",
      "status": "ACTIVE"
    }
  ]
}
```

#### `POST /api/rooms`
Создать новое помещение.

#### `PATCH /api/rooms/:id`
Обновить помещение.

#### `DELETE /api/rooms/:id`
Удалить помещение (архивировать).

---

### 3.2. Преподаватели (Teachers)

#### `GET /api/teachers`
Получить список преподавателей.

**Response 200:**
```json
{
  "teachers": [
    {
      "id": "uuid",
      "lastName": "Иванова",
      "firstName": "Анна",
      "middleName": "Сергеевна",
      "phone": "+79001234567",
      "email": "ivanova@example.com",
      "photoUrl": "https://...",
      "status": "ACTIVE",
      "studios": ["Танцы", "Йога"]
    }
  ]
}
```

#### `POST /api/teachers`
Создать нового преподавателя.

#### `PATCH /api/teachers/:id`
Обновить преподавателя.

---

### 3.3. Льготные категории (BenefitCategories)

#### `GET /api/benefit-categories`
Получить список льготных категорий.

**Response 200:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Многодетная семья",
      "discountPercentage": 10.00,
      "description": "Скидка для многодетных семей"
    }
  ]
}
```

#### `POST /api/benefit-categories`
Создать новую льготную категорию.

#### `PATCH /api/benefit-categories/:id`
Обновить льготную категорию.

---

### 3.4. Пользователи (Users)

#### `GET /api/users`
Получить список пользователей системы.

**Response 200:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "admin@culturalcenter.ru",
      "lastName": "Сидорова",
      "firstName": "Елена",
      "phone": "+79001234567",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  ]
}
```

#### `POST /api/users`
Создать нового пользователя.

#### `PATCH /api/users/:id`
Обновить пользователя.

---

## 4. Права доступа

### 4.1. Администратор
- Полный доступ ко всем справочникам (создание, редактирование, удаление)

### 4.2. Менеджер
- Просмотр всех справочников
- Не может редактировать

### 4.3. Преподаватель
- Просмотр справочника помещений и преподавателей
- Не может редактировать

---

## Заключение

Модуль Справочников обеспечивает управление базовыми сущностями системы, которые используются во всех остальных модулях.
