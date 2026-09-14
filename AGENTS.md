# Инструкции для агентов

Монорепозиторий NestJS: публичный GraphQL на `apps/gateway`, доменные сервисы в `apps/*`, контракты в `libs/proto`, общее — в `libs/common`. Фронт — Next.js в `apps/web-client` (pnpm workspace-пакет, не Nest-приложение).

## Команды

Новый бэкенд-микросервис только так:

```bash
pnpm exec nest generate app <name>
```

Новая библиотека:

```bash
pnpm exec nest generate library <name> --prefix app
```

После генерации задайте в `libs/<name>/package.json` поле `"name": "@libs/<name>"` и зависимость `"@libs/<name>": "workspace:*"` в корневом `package.json`. Из Nest-приложений в `apps/*` импортируйте библиотеки как `@libs/common` / `@libs/proto`, не через `../../../libs`. `apps/web-client` в libs не ходит.

Резолверы GraphQL — только в проекте `gateway`. Во всех `apps/*/src` папки по типу (`controllers/`, `services/`, `interceptors/` и т.д.), не по фичам; Nest-модуль — только корневой. GraphQL-резолверы — только в `apps/gateway/src/resolvers/`.

Весь стек Node-сервисов:

```bash
pnpm run start:all
```

`start:all` / `start:all:dev` запускают `users`, `mailer`, `files` и `gateway` параллельно через `concurrently` (`pnpm run start:<name>`). Падение одного процесса остальные не убивает (`--kill-others-on-fail false`). Ctrl+C останавливает всех детей. `start:all:prod` сначала собирает `build:*:prod` (без `.d.ts` / `.js.map`), затем те же процессы из `dist/`.

Новый микросервис: `pnpm exec nest generate app <name>`, скрипт `start:<name>` (и при необходимости `start:<name>:prod` / `build:<name>:prod`) и строка в `concurrently` в `start:all` / `start:all:prod`. Отдельный оркестратор и `wait-on` не используются.

Фронт (не Nest, не через `nest generate`, не в `nest-cli.json`): пакет `apps/web-client`, запуск из корня `pnpm run start:web` (порт **4000**; 3000-е оставлены серверам: gateway 3000, mailer 3001). В `start:all` не входит. Линт фронта: `pnpm run lint:web`. Формат: `pnpm run format:web`. Корневые `pnpm lint` / `format` / vitest `apps/web-client` не трогают. Из web-client не импортировать `@libs/*`.

Если порты 3000 / 3001 / 3002 / 4000 / 50051 / 50052 заняты (EADDRINUSE) — остановите предыдущий `start:all` / `start:web` или процессы на этих портах вручную.

## Архитектура

- Синхронные вызовы между сервисами — gRPC.
- Асинхронные события — RabbitMQ (topic-exchange `users.events`, у каждого consumer своя очередь).
- У каждого сервиса своя Prisma-схема и логическая БД. У gateway есть только read-model (проекция публичного профиля), не source of truth.
- gRPC слушать на `127.0.0.1`, не публиковать.
- В каждый gRPC-вызов класть `x-internal-token`. После аутентификации на gateway передавать `user-id` в metadata.
- Не доверять user id из клиентского GraphQL-входа.
- Не читать и не коммитить `.env`, `dev.env`, `config.json`, `dev.example.env`, `config.example.json`. Шаблон — `.env.example`.
- Документация для пользователя — на русском.
- Runtime — CommonJS; относительные импорты без расширений файлов.
- Из Nest-приложений импортировать libs как `@libs/common` / `@libs/proto`, не `../../../libs`. `apps/web-client` в `@libs/*` не ходит.

## Проверка

```bash
pnpm lint
pnpm run build:gateway
pnpm run build:users
pnpm run build:files
```

Перед сдачей UI/HTTP — `pnpm run start:all`, затем GraphQL register → login → me.
