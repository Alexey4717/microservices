# Инструкции для агентов

Монорепозиторий NestJS: публичный GraphQL на `apps/gateway`, доменные сервисы в `apps/*`, контракты в `libs/proto`, общее — в `libs/common`, клиентский GraphQL — в `libs/graphql`. Фронт — Next.js в `apps/web-client` (pnpm workspace-пакет, не Nest-приложение). Telegram Mini App — Vite + React в `apps/telegram-mini-app` (тоже pnpm workspace-пакет, не Nest).

## Команды

Новый бэкенд-микросервис только так:

```bash
pnpm exec nest generate app <name>
```

Новая Nest-библиотека:

```bash
pnpm exec nest generate library <name> --prefix app
```

После генерации задайте в `libs/<name>/package.json` поле `"name": "@libs/<name>"`, поле `consumers` (кто может импортировать пакет; без списка импорт запрещён) и зависимость `"@libs/<name>": "workspace:*"` в корневом `package.json`. Из Nest-приложений в `apps/*` импортируйте библиотеки как `@libs/common` / `@libs/proto`, не через `../../../libs`. Клиентский контракт без Nest-модуля кладётся в `libs/` руками и в `nest-cli.json` не регистрируется; `workspace:*` на него — только у пакетов из `consumers`, не в корневом `package.json`. Сейчас так устроен `@libs/graphql`: операции и `schema.graphql`, codegen — `pnpm codegen`. После смены схемы gateway поднимите gateway (в development `autoSchemaFile` перезапишет `libs/graphql/schema.graphql`) и снова выполните `pnpm codegen`.

Резолверы GraphQL — только в проекте `gateway`. Во всех `apps/*/src` папки по типу (`controllers/`, `services/`, `interceptors/` и т.д.), не по фичам; Nest-модуль — только корневой. GraphQL-резолверы — только в `apps/gateway/src/resolvers/`.

Весь стек Node-сервисов:

```bash
pnpm run start:all
```

`start:all` / `start:all:dev` запускают `users`, `mailer`, `files`, `payments`, `telegram`, `ai-assistant` и `gateway` параллельно через `concurrently` (`pnpm run start:<name>`). Падение одного процесса остальные не убивает (`--kill-others-on-fail false`). Ctrl+C останавливает всех детей. `start:all:prod` сначала вызывает `build:services:prod` (последовательный `build:prod` всех `@apps/*`, без `.d.ts` / `.js.map`, без кэша Turbo), затем те же процессы из `dist/`. Долгоживущий dev через Turbo не запускать: watch остаётся на `concurrently`.

Новый Nest-сервис: `pnpm exec nest generate app <name>`, затем `apps/<name>/package.json` с именем `@apps/<name>` и скриптами `dev` / `build` / `build:prod` / `start:prod` через `pnpm -w exec` / `pnpm -w run` (без своих `dependencies`: версии Nest живут в корне). В корне — однострочные алиасы `start:<name>`, `build:<name>`, `build:<name>:prod`, `start:<name>:prod` (`pnpm --filter @apps/<name> ...`) и строка в `concurrently` в `start:all` / `start:all:prod`. Отдельный оркестратор и `wait-on` не используются. `nest-cli.json` и tsconfig не менять. Сборки Nest в граф Turbo по отдельности не ставить: их вызывает только последовательный `build:services` (`pnpm --workspace-concurrency=1 --filter "@apps/*"`), кэш — целиком `dist/**`.

Новый веб или Expo: каталог в `apps/` со скриптами `dev`, `build` и `lint`, плюс игнор в корневом ESLint и исключение этого каталога из `inputs` задачи `//#build:services` в `turbo.json` (иначе правка фронта пересоберёт бэкенд).

Фронт (не Nest, не через `nest generate`, не в `nest-cli.json`): пакет `apps/web-client`, запуск из корня `pnpm run start:web` (порт **4000**; 3000-е оставлены серверам: gateway 3000, mailer 3001). В `start:all` не входит. Линт фронта: `pnpm run lint:web`. Формат: `pnpm run format:web`. Корневые `pnpm lint` / `format` / vitest `apps/web-client` не трогают. Из web-client импорт `@libs/<name>` разрешён, только если `web-client` есть в `consumers` этой библиотеки (сейчас `@libs/graphql`).

Telegram Mini App (не Nest, не Next, не в `nest-cli.json`): пакет `apps/telegram-mini-app` (имя `telegram-mini-app`), Vite + React, порт **4001**. Запуск `pnpm run start:telegram-mini`. В `start:all` не входит. GraphQL — относительный `/graphql` (Vite проксирует на gateway `:3000`). Линт: `pnpm run lint:telegram-mini`. Формат: `pnpm run format:telegram-mini`. Из Mini App импорт `@libs/<name>` разрешён, только если `telegram-mini-app` есть в `consumers` (сейчас `@libs/graphql`).

Если порты 3000 / 3001 / 3002 / 3003 / 3004 / 3005 / 4000 / 4001 / 50051 / 50052 / 50053 / 50054 заняты (EADDRINUSE) — остановите предыдущий `start:all` / `start:web` / `start:telegram-mini` или процессы на этих портах вручную.

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
- Из Nest-приложений импортировать libs как `@libs/common` / `@libs/proto`, не `../../../libs`. Кто имеет право на `@libs/<name>`, задаёт поле `consumers` в `package.json` библиотеки; ESLint это проверяет. `@libs/common` — `@apps/*` и `@libs/proto`, `@libs/proto` — `@apps/*`, `@libs/graphql` — `web-client` и `telegram-mini-app`.

## Проверка

```bash
pnpm lint
pnpm run build:services
```

Отдельный сервис по-прежнему собирается прежними командами: `pnpm run build:gateway`, `build:users`, `build:files`, `build:payments`, `build:ai-assistant` и остальные `build:<name>`. `pnpm run build` — Turbo: `build:services` плюс сборки `web-client` и `telegram-mini-app`.

Перед сдачей UI/HTTP — `pnpm run start:all`, затем GraphQL register → login → me.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
