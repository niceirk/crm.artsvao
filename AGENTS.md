# Repository Guidelines

## Структура проекта и модули
- Монорепозиторий: `frontend/` (Next.js 14, App Router) и `backend/` (NestJS 10). В фронтенде основной код в `frontend/src`: маршруты в `app/`, общие UI в `components/ui`, доменные блоки в `components/*`, хуки в `hooks/`, типы в `types/`. Статика лежит в `frontend/public`.
- Бэкенд-модули в `backend/src` (`auth`, `clients`, `schedule`, `payments` и др.) со своими контроллерами/сервисами/DTO. Prisma схема, миграции и сиды — в `backend/prisma`. E2E тесты — `backend/test`.
- За архитектурой и разрезом модулей сверяйтесь с `PROJECT_STRUCTURE.md` и `modules/*.md` перед добавлением новых API или сущностей.

## Сборка, тесты и запуск
- Docker-стек: `docker-compose up -d` (нужны скопированные env из `frontend/.env.example` и `backend/.env.example`); поднимает БД и pgAdmin.
- Backend: `cd backend && npm install && npm run start:dev` (watch), `npm run build` (прод). Тесты: `npm run test` (unit), `npm run test:e2e`, `npm run test:cov`. Prisma: `npx prisma migrate dev --name <name>`, `npx prisma db seed`.
- Frontend: `cd frontend && npm install && npm run dev` на порту 3000; `npm run build` для продакшена; `npm run lint` перед коммитом.
- В корне: `npm run test:db` проверяет подключение к БД; `npm run prisma:generate|migrate|seed` пробрасывают Prisma-команды.

## Стиль кода и именование
- TypeScript по умолчанию. Следуйте `CODING_STANDARDS.md`: файлы в `kebab-case`, React-компоненты в `PascalCase`, хуки с префиксом `use`, DTO/сервисы/гарды с суффиксами (`*.dto.ts`, `*.service.ts`). Делите модули по SRP и не складывайте разную ответственность в один класс.
- Форматирование и линт: Prettier/ESLint настроены (`npm run lint`/`npm run format` в backend, `npm run lint` в frontend). Tailwind/shadcn компоненты держим в `components/ui`; переиспользуйте существующие токены/утилиты.

## Тестирование
- Backend: Jest. Unit-спеки `*.spec.ts` рядом с кодом; E2E в `backend/test` на базе Supertest. При доработках добавляйте/обновляйте тесты и добивайтесь прохождения `npm run test:cov`.
- Frontend: сейчас фокус на линте; при добавлении нетривиальной UI-логики или data-hooks пишите тесты и фиксируйте временные пропуски.

## Коммиты и Pull Request'ы
- История короткая и действие-ориентированная на русском (“Обновлен импорт клиентов”, “Исправлен деплой”). Коммиты — небольшие, в настоящем времени, с явным контекстом модуля; выносите рефакторинг отдельно от функциональных изменений.
- PR: краткое описание, ссылка на задачу/issue, пометки о миграциях/ENV, скриншоты для UI, перечень выполненных команд тестов. Явно указывайте долги и договоренности на последующие спринты.

## Безопасность и конфигурация
- Секреты держите в локальных env (`frontend/.env.local`, `backend/.env`), не коммитьте. Добавили переменную — обновите `.env.example`.
- Изменения БД только через Prisma миграции, без ручных правок. При обновлении сидов редактируйте `backend/prisma/seed.ts` и прогоняйте сиды в Docker.
