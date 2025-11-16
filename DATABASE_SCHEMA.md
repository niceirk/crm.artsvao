# Схема базы данных

## ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    User ||--o{ Rental : "manages"
    User {
        uuid id PK
        string email UK
        string password_hash
        enum role
        string first_name
        string last_name
        enum status
        timestamp created_at
        timestamp updated_at
    }

    Client ||--o{ ClientRelation : "has relations"
    Client ||--o{ Subscription : "has"
    Client ||--o{ Attendance : "attends"
    Client ||--o{ Payment : "pays"
    Client ||--o{ Invoice : "receives"
    Client ||--o| BenefitCategory : "has benefit"
    Client {
        uuid id PK
        string first_name
        string last_name
        string middle_name
        date date_of_birth
        enum gender
        string phone
        string email
        string address
        string photo_url
        text notes
        enum status
        timestamp created_at
        timestamp updated_at
    }

    ClientRelation {
        uuid id PK
        uuid client_id FK
        uuid related_client_id FK
        enum relation_type
        timestamp created_at
    }

    Room ||--o{ Schedule : "used in"
    Room ||--o{ Group : "default for"
    Room ||--o{ Rental : "rented"
    Room }o--o{ Event : "hosts"
    Room {
        uuid id PK
        string name
        string number
        decimal area
        integer capacity
        enum type
        text equipment
        decimal hourly_rate
        decimal daily_rate
        enum status
        timestamp created_at
        timestamp updated_at
    }

    Teacher ||--o{ Group : "teaches"
    Teacher ||--o{ Schedule : "conducts"
    Teacher {
        uuid id PK
        string first_name
        string last_name
        string middle_name
        string phone
        string email
        string specialization
        decimal salary_percentage
        string photo_url
        enum status
        timestamp created_at
        timestamp updated_at
    }

    Studio ||--o{ Group : "has"
    Studio {
        uuid id PK
        string name
        text description
        enum type
        string category
        integer age_min
        integer age_max
        string photo_url
        enum status
        timestamp created_at
        timestamp updated_at
    }

    Group ||--o{ Schedule : "scheduled"
    Group ||--o{ SubscriptionType : "offers"
    Group ||--o{ Subscription : "has"
    Group {
        uuid id PK
        uuid studio_id FK
        string name
        uuid teacher_id FK
        uuid room_id FK
        integer max_participants
        decimal single_session_price
        enum status
        timestamp created_at
        timestamp updated_at
    }

    Schedule ||--o{ Attendance : "has attendance"
    Schedule {
        uuid id PK
        uuid group_id FK
        uuid teacher_id FK
        uuid room_id FK
        date date
        time start_time
        time end_time
        enum type
        boolean is_recurring
        string recurrence_rule
        enum status
        text notes
        timestamp created_at
        timestamp updated_at
    }

    Attendance {
        uuid id PK
        uuid schedule_id FK
        uuid client_id FK
        enum status
        text notes
        boolean subscription_deducted
        timestamp created_at
    }

    SubscriptionType ||--o{ Subscription : "defines"
    SubscriptionType {
        uuid id PK
        string name
        text description
        uuid group_id FK
        enum type
        decimal price
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    Subscription ||--o{ Payment : "paid with"
    Subscription ||--o{ Invoice : "invoiced"
    Subscription ||--o{ SubscriptionCompensation : "has"
    Subscription {
        uuid id PK
        uuid client_id FK
        uuid subscription_type_id FK
        uuid group_id FK
        string valid_month
        date purchase_date
        date start_date
        date end_date
        decimal original_price
        decimal paid_price
        integer remaining_visits
        integer purchased_months
        enum status
        timestamp created_at
        timestamp updated_at
    }

    SubscriptionCompensation {
        uuid id PK
        uuid subscription_id FK
        date compensation_date
        integer missed_classes
        decimal compensation_amount
        string medical_certificate_url
        text reason
        enum status
        string processed_by
        timestamp processed_at
        text notes
        timestamp created_at
        timestamp updated_at
    }

    Payment ||--o| Invoice : "pays"
    Payment {
        uuid id PK
        uuid client_id FK
        uuid invoice_id FK
        decimal amount
        enum payment_method
        enum payment_type
        enum status
        string transaction_id
        uuid subscription_id FK
        uuid rental_id FK
        text notes
        timestamp created_at
        timestamp updated_at
    }

    BenefitCategory ||--o{ Client : "grants discount"
    BenefitCategory {
        uuid id PK
        string name UK
        decimal discount_percent
        text description
        boolean requires_document
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    ServiceCategory ||--o{ Service : "categorizes"
    ServiceCategory {
        uuid id PK
        string name UK
        text description
        string icon
        string color
        integer sort_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    Service ||--o{ InvoiceItem : "sold via"
    Service ||--o| Group : "for group"
    Service ||--o| Room : "for room"
    Service ||--o| ServiceCategory : "belongs to"
    Service {
        uuid id PK
        string name
        text description
        string short_description
        uuid category_id FK
        enum service_type
        decimal base_price
        decimal vat_rate
        decimal price_with_vat
        string unit_of_measure
        enum write_off_timing
        integer default_quantity
        uuid group_id FK
        uuid room_id FK
        boolean is_active
        boolean is_archived
        integer sort_order
        timestamp created_at
        timestamp updated_at
    }

    Invoice ||--o{ InvoiceItem : "contains"
    Invoice ||--o{ Payment : "paid via"
    Invoice ||--o| Subscription : "for subscription"
    Invoice ||--o| Rental : "for rental"
    Invoice ||--o{ InvoiceAuditLog : "has audit"
    Invoice {
        uuid id PK
        string invoice_number UK
        uuid client_id FK
        uuid subscription_id FK
        uuid rental_id FK
        decimal subtotal
        decimal discount_amount
        decimal total_amount
        enum status
        timestamp issued_at
        date due_date
        timestamp paid_at
        text notes
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    InvoiceItem {
        uuid id PK
        uuid invoice_id FK
        uuid service_id FK
        enum service_type
        string service_name
        text service_description
        uuid subscription_type_id FK
        uuid room_id FK
        decimal quantity
        decimal unit_price
        decimal base_price
        decimal vat_rate
        decimal vat_amount
        decimal discount_percent
        decimal discount_amount
        decimal total_price
        enum write_off_timing
        enum write_off_status
        decimal remaining_quantity
        boolean is_price_adjusted
        text adjustment_reason
        timestamp created_at
        timestamp updated_at
    }

    InvoiceAuditLog {
        uuid id PK
        uuid invoice_id FK
        uuid item_id FK
        enum action
        string field_name
        string old_value
        string new_value
        text reason
        uuid user_id FK
        timestamp created_at
    }

    Rental ||--o{ Payment : "paid with"
    Rental ||--o{ Invoice : "invoiced"
    Rental {
        uuid id PK
        uuid room_id FK
        string client_name
        string client_phone
        string client_email
        string event_type
        date date
        time start_time
        time end_time
        decimal total_price
        enum status
        uuid manager_id FK
        text notes
        timestamp created_at
        timestamp updated_at
    }

    Event {
        uuid id PK
        string name
        text description
        string event_type
        date date
        time start_time
        time end_time
        uuid_array room_ids
        integer max_capacity
        uuid responsible_user_id FK
        string photo_url
        enum status
        timestamp created_at
        timestamp updated_at
    }

    SalaryCalculation {
        uuid id PK
        date period_start
        date period_end
        enum employee_type
        uuid employee_id
        decimal base_amount
        decimal percentage
        decimal calculated_salary
        enum status
        text notes
        timestamp created_at
        timestamp updated_at
    }
```

## Индексы для оптимизации

### Client
```sql
CREATE INDEX idx_client_phone ON Client(phone);
CREATE INDEX idx_client_email ON Client(email);
CREATE INDEX idx_client_status ON Client(status);
CREATE INDEX idx_client_last_name ON Client(last_name);
```

### Schedule
```sql
CREATE INDEX idx_schedule_date ON Schedule(date);
CREATE INDEX idx_schedule_teacher ON Schedule(teacher_id);
CREATE INDEX idx_schedule_room ON Schedule(room_id);
CREATE INDEX idx_schedule_group ON Schedule(group_id);
CREATE INDEX idx_schedule_date_room ON Schedule(date, room_id);
```

### Attendance
```sql
CREATE INDEX idx_attendance_client ON Attendance(client_id);
CREATE INDEX idx_attendance_schedule ON Attendance(schedule_id);
CREATE INDEX idx_attendance_created ON Attendance(created_at);
```

### Payment
```sql
CREATE INDEX idx_payment_client ON Payment(client_id);
CREATE INDEX idx_payment_status ON Payment(status);
CREATE INDEX idx_payment_created ON Payment(created_at);
CREATE INDEX idx_payment_type ON Payment(payment_type);
```

### Subscription
```sql
CREATE INDEX idx_subscription_client ON Subscription(client_id);
CREATE INDEX idx_subscription_group ON Subscription(group_id);
CREATE INDEX idx_subscription_status ON Subscription(status);
CREATE INDEX idx_subscription_valid_month ON Subscription(valid_month);
CREATE INDEX idx_subscription_dates ON Subscription(start_date, end_date);
-- Composite index для поиска абонементов клиента по месяцу
CREATE INDEX idx_subscription_client_month ON Subscription(client_id, valid_month);
```

### SubscriptionCompensation
```sql
CREATE INDEX idx_subscription_compensation_subscription ON SubscriptionCompensation(subscription_id);
CREATE INDEX idx_subscription_compensation_status ON SubscriptionCompensation(status);
CREATE INDEX idx_subscription_compensation_date ON SubscriptionCompensation(compensation_date);
```

### Rental
```sql
CREATE INDEX idx_rental_date ON Rental(date);
CREATE INDEX idx_rental_room ON Rental(room_id);
CREATE INDEX idx_rental_manager ON Rental(manager_id);
CREATE INDEX idx_rental_status ON Rental(status);
```

### UserInvitation
```sql
CREATE UNIQUE INDEX idx_user_invitation_token ON UserInvitation(token);
CREATE INDEX idx_user_invitation_user ON UserInvitation(user_id);
CREATE INDEX idx_user_invitation_expires ON UserInvitation(expires_at);
```

### PasswordResetToken
```sql
CREATE UNIQUE INDEX idx_password_reset_token ON PasswordResetToken(token);
CREATE INDEX idx_password_reset_user ON PasswordResetToken(user_id);
CREATE INDEX idx_password_reset_expires ON PasswordResetToken(expires_at);
```

### AuditLog
```sql
CREATE INDEX idx_audit_log_user ON AuditLog(user_id);
CREATE INDEX idx_audit_log_entity_type ON AuditLog(entity_type);
CREATE INDEX idx_audit_log_entity_id ON AuditLog(entity_id);
CREATE INDEX idx_audit_log_action ON AuditLog(action);
CREATE INDEX idx_audit_log_created ON AuditLog(created_at);
-- Composite index для частого запроса: фильтр по пользователю + дате
CREATE INDEX idx_audit_log_user_created ON AuditLog(user_id, created_at DESC);
```

### Client (дополнительные индексы для юрлиц)
```sql
CREATE INDEX idx_client_type ON Client(client_type);
CREATE INDEX idx_client_inn ON Client(inn);
CREATE INDEX idx_client_company_name ON Client(company_name);
-- Composite index для поиска компаний
CREATE INDEX idx_client_type_company_name ON Client(client_type, company_name);
```

### CompanyContact
```sql
CREATE INDEX idx_company_contact_client ON CompanyContact(client_id);
CREATE INDEX idx_company_contact_phone ON CompanyContact(phone);
CREATE INDEX idx_company_contact_is_primary ON CompanyContact(client_id, is_primary);
```

### Rental (дополнительный индекс)
```sql
CREATE INDEX idx_rental_client ON Rental(client_id);
```

### Invoice
```sql
CREATE INDEX idx_invoice_client ON Invoice(client_id);
CREATE INDEX idx_invoice_subscription ON Invoice(subscription_id);
CREATE INDEX idx_invoice_rental ON Invoice(rental_id);
CREATE INDEX idx_invoice_status ON Invoice(status);
CREATE INDEX idx_invoice_issued ON Invoice(issued_at);
CREATE INDEX idx_invoice_due ON Invoice(due_date);
CREATE UNIQUE INDEX idx_invoice_number ON Invoice(invoice_number);
```

### InvoiceItem
```sql
CREATE INDEX idx_invoice_item_invoice ON InvoiceItem(invoice_id);
CREATE INDEX idx_invoice_item_write_off_status ON InvoiceItem(write_off_status);
```

### InvoiceAuditLog
```sql
CREATE INDEX idx_invoice_audit_invoice ON InvoiceAuditLog(invoice_id);
CREATE INDEX idx_invoice_audit_user ON InvoiceAuditLog(user_id);
CREATE INDEX idx_invoice_audit_created ON InvoiceAuditLog(created_at);
CREATE INDEX idx_invoice_audit_action ON InvoiceAuditLog(action);
```

### BenefitCategory
```sql
CREATE UNIQUE INDEX idx_benefit_category_name ON BenefitCategory(name);
CREATE INDEX idx_benefit_category_active ON BenefitCategory(is_active);
```

### ServiceCategory
```sql
CREATE UNIQUE INDEX idx_service_category_name ON ServiceCategory(name);
CREATE INDEX idx_service_category_active ON ServiceCategory(is_active);
CREATE INDEX idx_service_category_sort ON ServiceCategory(sort_order);
```

### Service
```sql
CREATE INDEX idx_service_category ON Service(category_id);
CREATE INDEX idx_service_type ON Service(service_type);
CREATE INDEX idx_service_active ON Service(is_active);
CREATE INDEX idx_service_archived ON Service(is_archived);
CREATE INDEX idx_service_group ON Service(group_id);
CREATE INDEX idx_service_room ON Service(room_id);
CREATE INDEX idx_service_sort ON Service(sort_order);
-- Composite index для поиска активных услуг по категории
CREATE INDEX idx_service_category_active ON Service(category_id, is_active);
```

### InvoiceItem (дополнительные индексы)
```sql
CREATE INDEX idx_invoice_item_service ON InvoiceItem(service_id);
CREATE INDEX idx_invoice_item_subscription_type ON InvoiceItem(subscription_type_id);
```

### RentalContract
```sql
CREATE INDEX idx_rental_contract_rental ON RentalContract(rental_id);
CREATE INDEX idx_rental_contract_number ON RentalContract(contract_number);
CREATE INDEX idx_rental_contract_date ON RentalContract(contract_date);
CREATE INDEX idx_rental_contract_status ON RentalContract(status);
```

---

## Пример Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  MANAGER
}

enum UserStatus {
  ACTIVE
  BLOCKED
}

model User {
  id            String      @id @default(uuid())
  email         String      @unique
  passwordHash  String?     @map("password_hash")  // Nullable для invite flow
  role          UserRole
  firstName     String      @map("first_name")
  lastName      String      @map("last_name")
  status        UserStatus  @default(BLOCKED)  // BLOCKED до активации через invite
  lastLoginAt   DateTime?   @map("last_login_at")  // Время последнего входа
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  rentals           Rental[]
  events            Event[]
  auditLogs         AuditLog[]
  createdInvoices   Invoice[]        @relation("InvoiceCreator")
  invoiceAuditLogs  InvoiceAuditLog[] @relation("InvoiceAudit")
  invitations       UserInvitation[]
  systemSettings    SystemSettings[]

  @@map("users")
}

enum ClientStatus {
  ACTIVE
  INACTIVE
  VIP
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum ClientType {
  INDIVIDUAL  // Физическое лицо
  COMPANY     // Юридическое лицо
}

model Client {
  id              String        @id @default(uuid())

  // Тип клиента
  clientType      ClientType    @default(INDIVIDUAL) @map("client_type")

  // Поля для ФИЗИЧЕСКИХ ЛИЦ (clientType = INDIVIDUAL)
  firstName       String?       @map("first_name")  // Обязательно для физлиц
  lastName        String?       @map("last_name")   // Обязательно для физлиц
  middleName      String?       @map("middle_name")
  dateOfBirth     DateTime?     @map("date_of_birth") @db.Date
  gender          Gender?

  // Льготная категория
  benefitCategoryId  String?   @map("benefit_category_id")

  // Поля для ЮРИДИЧЕСКИХ ЛИЦ (clientType = COMPANY)
  companyName     String?       @map("company_name")  // Обязательно для компаний
  inn             String?       // ИНН (10-12 цифр) - Обязательно для компаний
  kpp             String?       // КПП (9 цифр) - Опционально
  ogrn            String?       // ОГРН (13 цифр) - Опционально
  legalAddress    String?       @map("legal_address") @db.Text  // Юридический адрес

  // Банковские реквизиты (для компаний)
  bankAccount           String?   @map("bank_account")  // Расчетный счет (20 цифр)
  bankName              String?   @map("bank_name")     // Название банка
  bik                   String?   // БИК банка (9 цифр)
  correspondentAccount  String?   @map("correspondent_account")  // Корр. счет

  // Общие поля для всех
  phone           String
  email           String?
  address         String?       @db.Text  // Фактический адрес (для физлиц или почтовый для компаний)
  photoUrl        String?       @map("photo_url")
  notes           String?       @db.Text
  status          ClientStatus  @default(ACTIVE)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  // Relations
  benefitCategory BenefitCategory? @relation(fields: [benefitCategoryId], references: [id], onDelete: SetNull)
  relations       ClientRelation[] @relation("ClientRelations")
  relatedTo       ClientRelation[] @relation("RelatedClientRelations")
  subscriptions   Subscription[]
  attendances     Attendance[]
  payments        Payment[]
  invoices        Invoice[]
  rentals         Rental[]         // Аренды помещений (в основном для компаний)
  companyContacts CompanyContact[]  // Контактные лица для компаний

  @@index([phone])
  @@index([email])
  @@index([status])
  @@index([lastName])
  @@index([clientType])
  @@index([inn])
  @@index([companyName])
  @@map("clients")
}

// Льготные категории для скидок
model BenefitCategory {
  id                 String   @id @default(uuid())
  name               String   @unique
  discountPercent    Decimal  @map("discount_percent") @db.Decimal(5, 2)
  description        String?  @db.Text
  requiresDocument   Boolean  @default(false) @map("requires_document")
  isActive           Boolean  @default(true) @map("is_active")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  clients            Client[]

  @@index([isActive])
  @@map("benefit_categories")
}

enum RelationType {
  PARENT
  CHILD
  SPOUSE
  SIBLING
}

model ClientRelation {
  id                String        @id @default(uuid())
  clientId          String        @map("client_id")
  relatedClientId   String        @map("related_client_id")
  relationType      RelationType  @map("relation_type")
  createdAt         DateTime      @default(now()) @map("created_at")

  client            Client        @relation("ClientRelations", fields: [clientId], references: [id], onDelete: Cascade)
  relatedClient     Client        @relation("RelatedClientRelations", fields: [relatedClientId], references: [id], onDelete: Cascade)

  @@map("client_relations")
}

// Контактные лица для компаний (юридических лиц)
model CompanyContact {
  id          String    @id @default(uuid())
  clientId    String    @map("client_id")  // Ссылка на Client где clientType = COMPANY
  firstName   String    @map("first_name")
  lastName    String    @map("last_name")
  middleName  String?   @map("middle_name")
  position    String?   // Должность (например: "Директор", "Главный бухгалтер")
  phone       String
  email       String?
  isPrimary   Boolean   @default(false) @map("is_primary")  // Основной контакт
  notes       String?   @db.Text
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  client      Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([phone])
  @@map("company_contacts")
}

enum RoomType {
  HALL
  CLASS
  STUDIO
  CONFERENCE
}

enum RoomStatus {
  AVAILABLE
  MAINTENANCE
  RETIRED
}

model Room {
  id            String      @id @default(uuid())
  name          String
  number        String?
  area          Decimal?    @db.Decimal(10, 2)
  capacity      Int?
  type          RoomType
  equipment     String?     @db.Text
  hourlyRate    Decimal     @map("hourly_rate") @db.Decimal(10, 2)
  dailyRate     Decimal?    @map("daily_rate") @db.Decimal(10, 2)
  status        RoomStatus  @default(AVAILABLE)
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  schedules     Schedule[]
  groups        Group[]
  rentals       Rental[]
  invoiceItems  InvoiceItem[]

  @@map("rooms")
}

enum TeacherStatus {
  ACTIVE
  VACATION
  DISMISSED
}

model Teacher {
  id                String         @id @default(uuid())
  firstName         String         @map("first_name")
  lastName          String         @map("last_name")
  middleName        String?        @map("middle_name")
  phone             String
  email             String?
  specialization    String?
  salaryPercentage  Decimal        @map("salary_percentage") @db.Decimal(5, 2)
  photoUrl          String?        @map("photo_url")
  status            TeacherStatus  @default(ACTIVE)
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  groups            Group[]
  schedules         Schedule[]

  @@map("teachers")
}

enum StudioType {
  GROUP
  INDIVIDUAL
  BOTH
}

enum StudioStatus {
  ACTIVE
  INACTIVE
}

model Studio {
  id                String          @id @default(uuid())
  name              String
  description       String?         @db.Text
  type              StudioType
  category          String?
  ageMin            Int?            @map("age_min")
  ageMax            Int?            @map("age_max")
  photoUrl          String?         @map("photo_url")
  status            StudioStatus    @default(ACTIVE)
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  groups            Group[]

  @@map("studios")
}

enum GroupStatus {
  ACTIVE
  INACTIVE
}

model Group {
  id                  String       @id @default(uuid())
  studioId            String       @map("studio_id")
  name                String
  teacherId           String       @map("teacher_id")
  roomId              String?      @map("room_id")
  maxParticipants     Int          @map("max_participants")
  singleSessionPrice  Decimal      @map("single_session_price") @db.Decimal(10, 2)
  status              GroupStatus  @default(ACTIVE)
  createdAt           DateTime     @default(now()) @map("created_at")
  updatedAt           DateTime     @updatedAt @map("updated_at")

  studio              Studio       @relation(fields: [studioId], references: [id], onDelete: Cascade)
  teacher             Teacher      @relation(fields: [teacherId], references: [id])
  room                Room?        @relation(fields: [roomId], references: [id])
  schedules           Schedule[]
  subscriptionTypes   SubscriptionType[]  // Типы абонементов для этой группы
  subscriptions       Subscription[]      // Абонементы, привязанные к этой группе

  @@map("groups")
}

enum ScheduleType {
  GROUP
  INDIVIDUAL
}

enum ScheduleStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

model Schedule {
  id              String          @id @default(uuid())
  groupId         String?         @map("group_id")
  teacherId       String          @map("teacher_id")
  roomId          String          @map("room_id")
  date            DateTime        @db.Date
  startTime       DateTime        @map("start_time") @db.Time
  endTime         DateTime        @map("end_time") @db.Time
  type            ScheduleType
  isRecurring     Boolean         @default(false) @map("is_recurring")
  recurrenceRule  String?         @map("recurrence_rule")
  status          ScheduleStatus  @default(SCHEDULED)
  notes           String?         @db.Text
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  group           Group?          @relation(fields: [groupId], references: [id])
  teacher         Teacher         @relation(fields: [teacherId], references: [id])
  room            Room            @relation(fields: [roomId], references: [id])
  attendances     Attendance[]

  @@index([date])
  @@index([teacherId])
  @@index([roomId])
  @@index([groupId])
  @@index([date, roomId])
  @@map("schedules")
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
}

model Attendance {
  id                    String            @id @default(uuid())
  scheduleId            String            @map("schedule_id")
  clientId              String            @map("client_id")
  status                AttendanceStatus
  notes                 String?           @db.Text
  subscriptionDeducted  Boolean           @default(false) @map("subscription_deducted")
  createdAt             DateTime          @default(now()) @map("created_at")

  schedule              Schedule          @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  client                Client            @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([scheduleId])
  @@index([createdAt])
  @@map("attendances")
}

enum SubscriptionTypeEnum {
  UNLIMITED      // Безлимитный абонемент на месяц
  SINGLE_VISIT   // Разовые посещения
}

model SubscriptionType {
  id            String                @id @default(uuid())
  name          String
  description   String?               @db.Text
  groupId       String                @map("group_id")  // Абонемент привязан к конкретной группе
  type          SubscriptionTypeEnum  // UNLIMITED (безлимитный) или SINGLE_VISIT (разовые посещения)
  price         Decimal               @db.Decimal(10, 2)  // Базовая цена за полный месяц
  isActive      Boolean               @default(true) @map("is_active")
  createdAt     DateTime              @default(now()) @map("created_at")
  updatedAt     DateTime              @updatedAt @map("updated_at")

  group         Group                 @relation(fields: [groupId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]
  invoiceItems  InvoiceItem[]

  @@index([groupId])
  @@map("subscription_types")
}

enum SubscriptionStatus {
  ACTIVE      // Активный абонемент
  EXPIRED     // Истек срок действия
  FROZEN      // Заморожен
  COMPENSATED // Компенсирован (по болезни с медицинской справкой)
}

model Subscription {
  id                  String              @id @default(uuid())
  clientId            String              @map("client_id")
  subscriptionTypeId  String              @map("subscription_type_id")
  groupId             String              @map("group_id")  // Группа, к которой привязан абонемент

  // Календарный месяц абонемента
  validMonth          String              @map("valid_month")  // Формат: "YYYY-MM" (например: "2025-11")

  // Даты
  purchaseDate        DateTime            @map("purchase_date") @db.Date  // Дата покупки
  startDate           DateTime            @map("start_date") @db.Date     // Дата начала действия (= purchaseDate)
  endDate             DateTime            @map("end_date") @db.Date        // Последний день месяца validMonth

  // Цены
  originalPrice       Decimal             @map("original_price") @db.Decimal(10, 2)  // Полная цена за месяц
  paidPrice           Decimal             @map("paid_price") @db.Decimal(10, 2)      // Фактически оплаченная (пропорциональная)

  // Остаток посещений (для разовых абонементов)
  remainingVisits     Int?                @map("remaining_visits")  // Null для безлимитных

  // Количество купленных месяцев (для мультимесячных покупок)
  purchasedMonths     Int                 @default(1) @map("purchased_months")  // По умолчанию 1 месяц

  status              SubscriptionStatus  @default(ACTIVE)
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  client              Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)
  subscriptionType    SubscriptionType    @relation(fields: [subscriptionTypeId], references: [id])
  group               Group               @relation(fields: [groupId], references: [id])
  payments            Payment[]
  invoices            Invoice[]
  compensations       SubscriptionCompensation[]

  @@index([clientId])
  @@index([groupId])
  @@index([status])
  @@index([validMonth])
  @@index([startDate, endDate])
  @@map("subscriptions")
}

// Компенсации за пропущенные занятия (по болезни с медицинской справкой)
enum CompensationStatus {
  PENDING   // Ожидает рассмотрения
  APPROVED  // Одобрена
  REJECTED  // Отклонена
}

model SubscriptionCompensation {
  id                      String              @id @default(uuid())
  subscriptionId          String              @map("subscription_id")
  compensationDate        DateTime            @map("compensation_date") @db.Date  // Дата подачи заявки на компенсацию
  missedClasses           Int                 @map("missed_classes")  // Количество пропущенных занятий
  compensationAmount      Decimal             @map("compensation_amount") @db.Decimal(10, 2)  // Сумма компенсации
  medicalCertificateUrl   String?             @map("medical_certificate_url")  // Путь к файлу медицинской справки
  reason                  String?             @db.Text  // Причина компенсации (дополнительные детали)
  status                  CompensationStatus  @default(PENDING)
  processedBy             String?             @map("processed_by")  // ID пользователя (менеджера/админа), обработавшего заявку
  processedAt             DateTime?           @map("processed_at")  // Время обработки заявки
  notes                   String?             @db.Text  // Заметки менеджера
  createdAt               DateTime            @default(now()) @map("created_at")
  updatedAt               DateTime            @updatedAt @map("updated_at")

  subscription            Subscription        @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
  @@index([status])
  @@index([compensationDate])
  @@map("subscription_compensations")
}

enum PaymentMethod {
  CASH
  CARD
  ONLINE
}

enum PaymentType {
  SUBSCRIPTION
  RENTAL
  SINGLE_VISIT
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

model Payment {
  id              String        @id @default(uuid())
  clientId        String        @map("client_id")
  invoiceId       String?       @map("invoice_id")
  amount          Decimal       @db.Decimal(10, 2)
  paymentMethod   PaymentMethod @map("payment_method")
  paymentType     PaymentType   @map("payment_type")
  status          PaymentStatus @default(PENDING)
  transactionId   String?       @map("transaction_id")
  subscriptionId  String?       @map("subscription_id")
  rentalId        String?       @map("rental_id")
  notes           String?       @db.Text
  paidAt          DateTime?     @map("paid_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  client          Client        @relation(fields: [clientId], references: [id])
  invoice         Invoice?      @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])
  rental          Rental?       @relation(fields: [rentalId], references: [id])

  @@index([clientId])
  @@index([invoiceId])
  @@index([status])
  @@index([createdAt])
  @@index([paymentType])
  @@map("payments")
}

// ============================================================================
// МОДУЛЬ СЧЕТОВ (INVOICES)
// ============================================================================

enum InvoiceStatus {
  DRAFT           // Черновик
  PENDING         // Ожидает оплаты
  PAID            // Оплачен
  PARTIALLY_PAID  // Частично оплачен
  OVERDUE         // Просрочен
  CANCELLED       // Отменен
}

model Invoice {
  id              String         @id @default(uuid())
  invoiceNumber   String         @unique @map("invoice_number")
  clientId        String         @map("client_id")
  subscriptionId  String?        @map("subscription_id")
  rentalId        String?        @map("rental_id")

  subtotal        Decimal        @db.Decimal(10, 2)
  discountAmount  Decimal        @default(0) @map("discount_amount") @db.Decimal(10, 2)
  totalAmount     Decimal        @map("total_amount") @db.Decimal(10, 2)

  status          InvoiceStatus  @default(PENDING)
  issuedAt        DateTime       @default(now()) @map("issued_at")
  dueDate         DateTime?      @map("due_date") @db.Date
  paidAt          DateTime?      @map("paid_at")

  notes           String?        @db.Text
  createdBy       String?        @map("created_by")

  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  client          Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  subscription    Subscription?  @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  rental          Rental?        @relation(fields: [rentalId], references: [id], onDelete: SetNull)
  creator         User?          @relation("InvoiceCreator", fields: [createdBy], references: [id], onDelete: SetNull)

  items           InvoiceItem[]
  payments        Payment[]
  auditLogs       InvoiceAuditLog[]

  @@index([clientId])
  @@index([subscriptionId])
  @@index([rentalId])
  @@index([status])
  @@index([issuedAt])
  @@index([dueDate])
  @@map("invoices")
}

enum ServiceType {
  SUBSCRIPTION      // Абонемент
  RENTAL            // Аренда
  SINGLE_SESSION    // Разовое занятие
  INDIVIDUAL_LESSON // Индивидуальное занятие
  COWORKING         // Коворкинг
  OTHER             // Прочие услуги
}

enum WriteOffTiming {
  ON_SALE   // Списание при продаже (оплате счета)
  ON_USE    // Списание при использовании
}

enum WriteOffStatus {
  PENDING       // Ожидает списания
  IN_PROGRESS   // Частично списано (для ON_USE)
  COMPLETED     // Полностью списано
  CANCELLED     // Отменено
}

model InvoiceItem {
  id                 String            @id @default(uuid())
  invoiceId          String            @map("invoice_id")

  serviceType        ServiceType       @map("service_type")
  serviceName        String            @map("service_name")
  serviceDescription String?           @map("service_description")

  subscriptionTypeId String?           @map("subscription_type_id")
  roomId             String?           @map("room_id")

  quantity           Decimal           @default(1) @db.Decimal(10, 2)
  unitPrice          Decimal           @map("unit_price") @db.Decimal(10, 2)
  basePrice          Decimal           @map("base_price") @db.Decimal(10, 2)
  discountPercent    Decimal           @default(0) @map("discount_percent") @db.Decimal(5, 2)
  discountAmount     Decimal           @default(0) @map("discount_amount") @db.Decimal(10, 2)
  totalPrice         Decimal           @map("total_price") @db.Decimal(10, 2)

  writeOffTiming     WriteOffTiming    @map("write_off_timing")
  writeOffStatus     WriteOffStatus    @default(PENDING) @map("write_off_status")
  remainingQuantity  Decimal?          @map("remaining_quantity") @db.Decimal(10, 2)

  isPriceAdjusted    Boolean           @default(false) @map("is_price_adjusted")
  adjustmentReason   String?           @map("adjustment_reason") @db.Text

  createdAt          DateTime          @default(now()) @map("created_at")
  updatedAt          DateTime          @updatedAt @map("updated_at")

  invoice            Invoice           @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  subscriptionType   SubscriptionType? @relation(fields: [subscriptionTypeId], references: [id], onDelete: SetNull)
  room               Room?             @relation(fields: [roomId], references: [id], onDelete: SetNull)

  @@index([invoiceId])
  @@index([writeOffStatus])
  @@map("invoice_items")
}

enum AuditAction {
  CREATED         // Счет создан
  UPDATED         // Обновлен
  PRICE_ADJUSTED  // Цена скорректирована
  STATUS_CHANGED  // Статус изменен
  ITEM_ADDED      // Позиция добавлена
  ITEM_REMOVED    // Позиция удалена
  CANCELLED       // Счет отменен
}

model InvoiceAuditLog {
  id          String   @id @default(uuid())
  invoiceId   String   @map("invoice_id")
  itemId      String?  @map("item_id")

  action      AuditAction
  fieldName   String   @map("field_name")
  oldValue    String?  @map("old_value")
  newValue    String?  @map("new_value")

  reason      String?  @db.Text
  userId      String   @map("user_id")

  createdAt   DateTime @default(now()) @map("created_at")

  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  user        User     @relation("InvoiceAudit", fields: [userId], references: [id])

  @@index([invoiceId])
  @@index([userId])
  @@index([createdAt])
  @@index([action])
  @@map("invoice_audit_logs")
}

enum RentalStatus {
  REQUEST
  CONFIRMED
  PAID
  COMPLETED
  CANCELLED
}

model Rental {
  id          String        @id @default(uuid())
  roomId      String        @map("room_id")

  // Связь с клиентом (может быть физлицо или компания)
  clientId    String?       @map("client_id")

  // Устаревшие поля для обратной совместимости (deprecated, use clientId)
  clientName  String?       @map("client_name")
  clientPhone String?       @map("client_phone")
  clientEmail String?       @map("client_email")

  eventType   String        @map("event_type")
  date        DateTime      @db.Date
  startTime   DateTime      @map("start_time") @db.Time
  endTime     DateTime      @map("end_time") @db.Time
  totalPrice  Decimal       @map("total_price") @db.Decimal(10, 2)
  status      RentalStatus  @default(REQUEST)
  managerId   String?       @map("manager_id")
  notes       String?       @db.Text
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  room        Room            @relation(fields: [roomId], references: [id])
  client      Client?         @relation(fields: [clientId], references: [id])
  manager     User?           @relation(fields: [managerId], references: [id])
  payments    Payment[]
  invoices    Invoice[]
  contract    RentalContract?  // Договор аренды (для компаний)

  @@index([date])
  @@index([roomId])
  @@index([clientId])
  @@index([managerId])
  @@index([status])
  @@map("rentals")
}

// Договоры аренды (для юридических лиц)
enum ContractStatus {
  DRAFT       // Черновик
  SIGNED      // Подписан
  COMPLETED   // Исполнен
  CANCELLED   // Отменен
}

model RentalContract {
  id              String          @id @default(uuid())
  rentalId        String          @unique @map("rental_id")  // Связь с Rental (one-to-one)
  contractNumber  String          @map("contract_number")    // Номер договора (например: "АР-001/2025")
  contractDate    DateTime        @map("contract_date") @db.Date  // Дата заключения договора
  fileUrl         String?         @map("file_url")           // Путь к PDF файлу договора
  status          ContractStatus  @default(DRAFT)
  notes           String?         @db.Text
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  rental          Rental          @relation(fields: [rentalId], references: [id], onDelete: Cascade)

  @@index([contractNumber])
  @@index([contractDate])
  @@map("rental_contracts")
}

enum EventStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

model Event {
  id                  String      @id @default(uuid())
  name                String
  description         String?     @db.Text
  eventType           String      @map("event_type")
  date                DateTime    @db.Date
  startTime           DateTime    @map("start_time") @db.Time
  endTime             DateTime    @map("end_time") @db.Time
  roomIds             String[]    @map("room_ids")
  maxCapacity         Int?        @map("max_capacity")
  responsibleUserId   String?     @map("responsible_user_id")
  photoUrl            String?     @map("photo_url")
  status              EventStatus @default(SCHEDULED)
  createdAt           DateTime    @default(now()) @map("created_at")
  updatedAt           DateTime    @updatedAt @map("updated_at")

  responsibleUser     User?       @relation(fields: [responsibleUserId], references: [id])

  @@map("events")
}

enum EmployeeType {
  TEACHER
  MANAGER
}

enum SalaryStatus {
  DRAFT
  CONFIRMED
  PAID
}

model SalaryCalculation {
  id                String        @id @default(uuid())
  periodStart       DateTime      @map("period_start") @db.Date
  periodEnd         DateTime      @map("period_end") @db.Date
  employeeType      EmployeeType  @map("employee_type")
  employeeId        String        @map("employee_id")
  baseAmount        Decimal       @map("base_amount") @db.Decimal(10, 2)
  percentage        Decimal       @db.Decimal(5, 2)
  calculatedSalary  Decimal       @map("calculated_salary") @db.Decimal(10, 2)
  status            SalaryStatus  @default(DRAFT)
  notes             String?       @db.Text
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  @@map("salary_calculations")
}

// ============================================================================
// НОВЫЕ ТАБЛИЦЫ ДЛЯ АВТОРИЗАЦИИ И АУДИТА
// ============================================================================

// Приглашения для новых пользователей
model UserInvitation {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  token      String    @unique  // UUID токен для invite link
  expiresAt  DateTime  @map("expires_at")  // Срок действия: 7 дней
  usedAt     DateTime? @map("used_at")  // Когда был использован (null = активен)
  createdAt  DateTime  @default(now()) @map("created_at")

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
  @@map("user_invitations")
}

// Таблица для хранения токенов сброса пароля
model PasswordResetToken {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  token      String    @unique  // UUID токен для reset link
  expiresAt  DateTime  @map("expires_at")  // Срок действия: 1 час
  usedAt     DateTime? @map("used_at")  // Когда был использован
  createdAt  DateTime  @default(now()) @map("created_at")

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}

// Журнал действий пользователей (полный аудит)
enum AuditAction {
  CREATE
  UPDATE
  DELETE
}

model AuditLog {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  action      AuditAction  // CREATE, UPDATE, DELETE
  entityType  String       @map("entity_type")  // "Client", "Staff", "Subscription", etc.
  entityId    String       @map("entity_id")    // ID измененной записи

  changes     Json?        // Детали изменений: { before: {...}, after: {...} }
  metadata    Json?        // Дополнительная информация

  ipAddress   String?      @map("ip_address")
  userAgent   String?      @map("user_agent")

  createdAt   DateTime     @default(now()) @map("created_at")

  @@index([userId])
  @@index([entityType])
  @@index([entityId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

// Системные настройки (singleton таблица)
model SystemSettings {
  id                String   @id @default("system") // Singleton - только одна запись!

  // Общая информация
  organizationName  String   @map("organization_name")
  legalName         String?  @map("legal_name")
  address           String?
  phone             String
  email             String
  website           String?
  logo              String?  // URL или path к логотипу

  // Рабочие часы (JSON)
  workingHours      Json     @map("working_hours")
  // Пример:
  // {
  //   "monday": { "open": "09:00", "close": "21:00" },
  //   "tuesday": { "open": "09:00", "close": "21:00" },
  //   ...
  //   "sunday": { "closed": true }
  // }

  // Email настройки
  smtpHost          String?  @map("smtp_host")
  smtpPort          Int?     @map("smtp_port")
  smtpUser          String?  @map("smtp_user")
  smtpPassword      String?  @map("smtp_password")  // Зашифровано!
  emailFrom         String?  @map("email_from")

  // Настройки уведомлений
  emailNotifications Json?   @map("email_notifications")
  // Пример:
  // {
  //   "subscriptionPurchased": true,
  //   "subscriptionExpiring": true,
  //   "eventReminder": true,
  //   "birthdayGreeting": false
  // }

  // Бизнес-параметры
  defaultCurrency              String  @default("RUB") @map("default_currency")
  timezone                     String  @default("Europe/Moscow")
  defaultSubscriptionValidity  Int     @default(30) @map("default_subscription_validity") // дней
  instructorPercentage         Decimal @default(40.0) @map("instructor_percentage") @db.Decimal(5, 2)  // % от стоимости
  allowExpiredSubscriptions    Boolean @default(false) @map("allow_expired_subscriptions")
  allowDeductAfterExpiry       Boolean @default(false) @map("allow_deduct_after_expiry")

  // Метаданные
  updatedAt         DateTime @updatedAt @map("updated_at")
  updatedBy         String?  @map("updated_by")  // ID администратора
  updatedByUser     User?    @relation(fields: [updatedBy], references: [id])

  @@map("system_settings")
}
```

---

## Описание ключевых таблиц

### Модуль счетов (Invoices)

#### Invoice (Счет на оплату)

Центральная таблица финансовой системы для управления счетами клиентов.

**Назначение**: Формирование счетов на оплату услуг (абонементы, аренда, разовые занятия)

**Ключевые поля**:
- `invoiceNumber` - Уникальный номер счета (формат: `INV-YYYYMMDD-XXXX`), генерируется автоматически
- `clientId` - Клиент (физлицо или компания)
- `subscriptionId` - Связь с абонементом (опционально)
- `rentalId` - Связь с арендой (опционально)
- `subtotal` - Сумма до скидок и НДС
- `discountAmount` - Общая скидка на весь счет
- `totalAmount` - Итоговая сумма к оплате (включая НДС и скидки)
- `status` - Статус счета (DRAFT/PENDING/PAID/PARTIALLY_PAID/OVERDUE/CANCELLED)
- `issuedAt` - Дата выставления счета
- `dueDate` - Срок оплаты
- `paidAt` - Дата оплаты
- `createdBy` - Кто создал счет (менеджер/администратор)

**Бизнес-логика**:
- Автоматическое создание при бронировании аренды (если указан `clientId`)
- Автоматическое создание при покупке абонемента (в разработке)
- Ручное создание менеджерами через UI
- Автоматический расчет сумм с учетом НДС и скидок
- Применение льготных категорий клиента

**Статусы**:
- `DRAFT` - Черновик (для будущего использования)
- `PENDING` - Ожидает оплаты (основной статус после создания)
- `PAID` - Полностью оплачен
- `PARTIALLY_PAID` - Частично оплачен
- `OVERDUE` - Просрочен (устанавливается автоматически после `dueDate`)
- `CANCELLED` - Отменен

#### InvoiceItem (Позиции счета)

Таблица позиций (строк) счета с подробной информацией об услуге.

**Назначение**: Детализация услуг в счете с гибкой логикой списания

**Ключевые поля**:
- `invoiceId` - Связь со счетом
- `serviceId` - Связь с услугой из номенклатуры (опционально)
- `serviceType` - Тип услуги (SUBSCRIPTION/RENTAL/SINGLE_SESSION/INDIVIDUAL_LESSON/OTHER)
- `serviceName` - Название услуги
- `serviceDescription` - Описание услуги
- `quantity` - Количество единиц
- `unitPrice` - Цена за единицу (после скидок)
- `basePrice` - Базовая цена за единицу (до скидок)
- `vatRate` - Ставка НДС (0%, 10%, 20%)
- `vatAmount` - Сумма НДС
- `discountPercent` - Процент скидки на позицию
- `discountAmount` - Сумма скидки
- `totalPrice` - Итоговая цена позиции
- `writeOffTiming` - Модель списания (ON_SALE/ON_USE)
- `writeOffStatus` - Статус списания (PENDING/IN_PROGRESS/COMPLETED/CANCELLED)
- `remainingQuantity` - Остаток количества для списания (для ON_USE)
- `isPriceAdjusted` - Флаг корректировки цены вручную
- `adjustmentReason` - Причина корректировки

**Модели списания (WriteOffTiming)**:
- `ON_SALE` - Списание при продаже (оплате счета)
  - Используется для: аренда, разовые занятия
  - Услуга считается полностью оказанной сразу после оплаты
- `ON_USE` - Списание при использовании
  - Используется для: абонементы, пакеты занятий
  - Списание происходит постепенно по мере посещения занятий
  - Отслеживается `remainingQuantity`

**Статусы списания (WriteOffStatus)**:
- `PENDING` - Ожидает списания (счет не оплачен или услуга не использована)
- `IN_PROGRESS` - Частично списано (для ON_USE, когда использована часть)
- `COMPLETED` - Полностью списано
- `CANCELLED` - Отменено (при отмене счета)

#### InvoiceAuditLog (Журнал аудита счетов)

Полный аудит всех изменений счетов для прозрачности и контроля.

**Назначение**: Отслеживание всех изменений счетов и их позиций

**Ключевые поля**:
- `invoiceId` - Связь со счетом
- `itemId` - Связь с позицией счета (опционально)
- `action` - Тип действия (CREATED/UPDATED/PRICE_ADJUSTED/STATUS_CHANGED/ITEM_ADDED/ITEM_REMOVED/CANCELLED)
- `fieldName` - Название измененного поля
- `oldValue` - Старое значение
- `newValue` - Новое значение
- `reason` - Причина изменения (обязательна для корректировок цен)
- `userId` - Кто внес изменение

**Отслеживаемые события**:
- Создание счета
- Изменение статуса
- Корректировка цен (требует обоснования)
- Добавление/удаление позиций
- Отмена счета

### Модуль номенклатуры услуг (Services)

#### ServiceCategory (Категории услуг)

Справочник категорий для группировки услуг.

**Назначение**: Классификация и организация услуг по категориям

**Ключевые поля**:
- `name` - Название категории (уникальное)
- `description` - Описание категории
- `icon` - Иконка для UI
- `color` - Цвет для визуального выделения
- `sortOrder` - Порядок сортировки
- `isActive` - Активность категории

**Примеры категорий**:
- Абонементы (танцы, вокал, гимнастика)
- Аренда помещений
- Разовые занятия
- Индивидуальные уроки
- Коворкинг
- Прочие услуги

#### Service (Номенклатура услуг)

Центральный справочник всех услуг культурного центра.

**Назначение**: Единая таблица для всех типов услуг с гибким ценообразованием

**Ключевые поля**:
- `name` - Название услуги
- `description` - Полное описание
- `shortDescription` - Краткое описание для UI
- `categoryId` - Категория услуги
- `serviceType` - Тип услуги (SUBSCRIPTION/RENTAL/SINGLE_SESSION/INDIVIDUAL_LESSON/OTHER)
- `basePrice` - Базовая цена (без НДС)
- `vatRate` - Ставка НДС (0%, 10%, 20%)
- `priceWithVat` - Цена с НДС (вычисляется автоматически)
- `unitOfMeasure` - Единица измерения (MONTH/HOUR/SESSION/DAY/PIECE)
- `writeOffTiming` - Модель списания (ON_SALE/ON_USE)
- `defaultQuantity` - Количество по умолчанию
- `groupId` - Связь с группой (для абонементов)
- `roomId` - Связь с помещением (для аренды)
- `isActive` - Активность услуги
- `isArchived` - Архивность (для скрытия устаревших услуг)
- `sortOrder` - Порядок сортировки

**Типы услуг (ServiceType)**:
- `SUBSCRIPTION` - Абонемент на занятия в группе
- `RENTAL` - Аренда помещения
- `SINGLE_SESSION` - Разовое групповое занятие
- `INDIVIDUAL_LESSON` - Индивидуальное занятие
- `OTHER` - Прочие услуги

**Единицы измерения (UnitOfMeasure)**:
- `MONTH` - Месяц (для абонементов)
- `HOUR` - Час (для аренды, индивидуальных занятий)
- `SESSION` - Занятие (для разовых посещений)
- `DAY` - День (для долгосрочной аренды)
- `PIECE` - Штука (для прочих услуг)

**Интеграция**:
- Связь с `InvoiceItem` через `serviceId`
- Автоматическое применение льгот из `BenefitCategory`
- Корректировка цен с аудитом через `InvoiceAuditLog`

#### BenefitCategory (Льготные категории)

Справочник льготных категорий клиентов для автоматического применения скидок.

**Назначение**: Управление скидками для различных категорий клиентов

**Ключевые поля**:
- `name` - Название категории (уникальное)
- `discountPercent` - Процент скидки (0-100%)
- `description` - Описание категории и условий применения
- `requiresDocument` - Требуется ли подтверждающий документ
- `isActive` - Активность категории

**Примеры категорий**:
- Многодетная семья (10%)
- Пенсионеры (15%)
- Студенты (5%)
- Сотрудники партнеров (20%)
- VIP клиенты (25%)

**Применение**:
- Скидка применяется автоматически при создании счета для клиента с `benefitCategoryId`
- Можно отменить/изменить вручную в позиции счета
- Все корректировки логируются в `InvoiceAuditLog`

---

## Миграции

После настройки Prisma schema, выполните:

```bash
# Создать миграцию
npx prisma migrate dev --name init

# Применить миграции
npx prisma migrate deploy

# Сгенерировать Prisma Client
npx prisma generate
```

---

## Seed данных (для разработки)

Создайте файл `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Создать администратора
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@culturalcenter.ru',
      passwordHash: adminPassword,
      role: 'ADMIN',
      firstName: 'Администратор',
      lastName: 'Системы',
      status: 'ACTIVE',
    },
  });

  console.log('Created admin:', admin);

  // Создать помещения
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        name: 'Большой зал',
        number: '101',
        capacity: 50,
        type: 'HALL',
        hourlyRate: 2000,
        dailyRate: 15000,
      },
    }),
    prisma.room.create({
      data: {
        name: 'Танцевальная студия',
        number: '201',
        capacity: 20,
        type: 'STUDIO',
        hourlyRate: 1500,
        dailyRate: 10000,
      },
    }),
    prisma.room.create({
      data: {
        name: 'Класс для занятий',
        number: '301',
        capacity: 15,
        type: 'CLASS',
        hourlyRate: 1000,
        dailyRate: 7000,
      },
    }),
  ]);

  console.log('Created rooms:', rooms.length);

  // Добавьте больше seed данных по необходимости
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Запустите:
```bash
npx prisma db seed
```
