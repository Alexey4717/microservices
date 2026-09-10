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

Watch: `start:all` / `start:all:dev` → `node scripts/start-all.mjs dev`. После сборки: `start:all:prod` → `node scripts/start-all.mjs prod` (`build:*:prod` без `.d.ts` / `.js.map`; watch остаётся на `tsconfig.app.json` с sourceMap). Оркестратор читает список из `scripts/services.mjs`: зависимости стартуют первыми, затем wait-on TCP (таймаут 60 с), затем зависимые. Падение или таймаут одного процесса убивает остальные.

Новый микросервис не требует npm-скриптов `wait:*` / `start:after-*`. После `pnpm exec nest generate app <name>` добавьте запись в `scripts/services.mjs` (`name`, `command` / `prodCommand`, `build` → `build:<name>:prod`, `port`, при необходимости `host` и `waitFor`).

Если порты 3000 / 50051 заняты (EADDRINUSE) — остановите предыдущий `start:all` или явно: `pnpm run start:all -- --kill-ports` (либо `KILL_PORTS=1`). По умолчанию оркестратор не убивает чужие процессы.

## Архитектура

- Синхронные вызовы между сервисами — gRPC.
- Асинхронные события — RabbitMQ.
- У каждого сервиса своя Prisma-схема и логическая БД. Gateway БД не имеет.
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
