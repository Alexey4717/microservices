# Инструкции для агентов

Монорепозиторий NestJS: публичный GraphQL на `apps/gateway`, доменные сервисы в `apps/*`, контракты в `libs/proto`, общее — в `libs/common`.

## Команды

Новое приложение только так:

```bash
pnpm exec nest generate app <name>
```

Новая библиотека:

```bash
pnpm exec nest generate library <name> --prefix app
```

После генерации задайте в `libs/<name>/package.json` поле `"name": "@libs/<name>"` и зависимость `"@libs/<name>": "workspace:*"` в корневом `package.json`. Из `apps/*` импортируйте библиотеки как `@libs/common` / `@libs/proto`, не через `../../../libs`.

Резолверы GraphQL — только в проекте `gateway`. Во всех `apps/*/src` папки по типу (`controllers/`, `services/`, `interceptors/` и т.д.), не по фичам; Nest-модуль — только корневой. GraphQL-резолверы — только в `apps/gateway/src/resolvers/`.

Весь стек Node-сервисов:

```bash
pnpm run start:all
```

`start:all` / `start:all:dev` запускают `users`, `mailer` и `gateway` параллельно через `concurrently` (`pnpm run start:<name>`). Падение одного процесса остальные не убивает (`--kill-others-on-fail false`). Ctrl+C останавливает всех детей. `start:all:prod` сначала собирает `build:*:prod` (без `.d.ts` / `.js.map`), затем те же процессы из `dist/`.

Новый микросервис: `pnpm exec nest generate app <name>`, скрипт `start:<name>` (и при необходимости `start:<name>:prod` / `build:<name>:prod`) и строка в `concurrently` в `start:all` / `start:all:prod`. Отдельный оркестратор и `wait-on` не используются.

Если порты 3000 / 3001 / 50051 заняты (EADDRINUSE) — остановите предыдущий `start:all` или процессы на этих портах вручную.

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
- Из приложений импортировать libs как `@libs/common` / `@libs/proto`, не `../../../libs`.

## Проверка

```bash
pnpm lint
pnpm run build:gateway
pnpm run build:users
```

Перед сдачей UI/HTTP — `pnpm run start:all`, затем GraphQL register → login → me.
