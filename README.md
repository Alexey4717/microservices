# Микросервисный монорепозиторий NestJS

Публичный API — GraphQL на `gateway`. Сервис `users` доступен только по gRPC (localhost) и публикует события в RabbitMQ. Сервис `mailer` слушает `user.created` и отправляет письма (без gRPC и без БД). Gateway хранит только read-model публичного профиля (не source of truth).

## Стек

- NestJS 12 (монорепозиторий), pnpm, ESLint
- GraphQL (Apollo, code-first) на gateway
- gRPC (`libs/proto/src/auth.proto`) — только `users`
- Prisma + PostgreSQL: логическая БД `users` (источник истины) и `gateway` (проекция профиля)
- RabbitMQ: topic-exchange `users.events` (`user.created`, `user.updated`, `user.authenticated`)
- nodemailer (`mailer`) — welcome-письмо при регистрации

## Структура

```text
apps/gateway   — публичный GraphQL + OAuth HTTP + проекция профиля
apps/users     — gRPC-сервис пользователей (Prisma)
apps/mailer    — consumer RabbitMQ, SMTP (nodemailer)
libs/proto     — protobuf-контракты (`@libs/proto`)
libs/common    — токены клиентов, события, маппинг RpcException (`@libs/common`)
```

## Как запустить

1. Скопируйте `.env.example` в `.env` и заполните значения (не коммитьте `.env`).
2. Установите зависимости: `pnpm install`.
3. Поднимите инфраструктуру:

```bash
docker compose up -d
```

Если Postgres уже создавался раньше (том `postgres_data`), `init.sql` повторно не выполнится. Создайте логическую БД gateway вручную:

```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE gateway;"
```

4. Примените миграции Prisma:

```bash
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:migrate:gateway
```

5. Запустите все сервисы одной командой:

```bash
pnpm run start:all
```

`start:all` и `start:all:dev` поднимают `users`, `mailer` и `gateway` параллельно через [concurrently](https://github.com/open-cli-tools/concurrently) (`pnpm run start:users` / `start:mailer` / `start:gateway`). Префиксы логов: `users`, `mailer`, `gateway`. Падение одного процесса остальные не гасит. Ctrl+C останавливает всех детей. Для собранного режима: `pnpm run start:all:prod` (сначала `build:*:prod` без `.d.ts`/`.js.map`, затем процессы из `dist/`). Docker Compose по-прежнему только для Postgres и RabbitMQ, не для Node-процессов.

Новый сервис: `pnpm exec nest generate app <name>`, скрипт `start:<name>` (и при необходимости `start:<name>:prod` / `build:<name>:prod`) и ещё одна команда в `concurrently` в `start:all` / `start:all:prod`.

Если при старте EADDRINUSE (порты 3000 / 3001 / 50051 заняты старым Nest) — остановите предыдущий `start:all` или процессы на этих портах вручную.

По отдельности: `pnpm run start:users`, `pnpm run start:mailer` и `pnpm run start:gateway`.

## Порты

| Сервис | Адрес | Назначение |
| --- | --- | --- |
| Gateway | `http://localhost:3000` | GraphQL и OAuth |
| GraphQL Playground | `http://localhost:3000/graphql` | IDE в режиме development |
| Mailer health | `http://127.0.0.1:3001/health` | `MAILER_HOST`:`MAILER_PORT` (по умолчанию localhost), внутренний HTTP |
| Users gRPC | `127.0.0.1:50051` | Только localhost, не публиковать |
| PostgreSQL | `localhost:5433` | БД `users` и `gateway` (порт хоста 5433, чтобы не пересечься с локальным Postgres) |
| RabbitMQ | `localhost:5672` | AMQP |
| RabbitMQ UI | `http://localhost:15672` | guest/guest |

## CQRS на gateway

Источник истины — Prisma `users` (пароль, OAuth, refresh-токены). На gateway в БД `gateway` лежит только публичный профиль: `id`, `email`, `name`, `avatarUrl`.

- Команды (`register` / `login` / `refresh` / `logout` / OAuth) всегда идут в `users` по gRPC. Если `users` недоступен — ошибка.
- `me` сначала вызывает gRPC с коротким timeout. При `UNAVAILABLE` / `DEADLINE_EXCEEDED` (и аналогах транспорта) отдаётся проекция, если запись уже есть.
- После успешного gRPC (register/login/oauth/refresh/`me`) gateway сразу пишет проекцию (write-through). Дополнительно `users` публикует `user.created` (полный публичный профиль) при создании пользователя и `user.updated` при последующем oauth-update.

В `.env` нужна `GATEWAY_DATABASE_URL` (шаблон в `.env.example`).

## Почта (mailer)

`mailer` не публикует gRPC и GraphQL: только consumer очереди `mailer.users-events` (binding `user.created` на exchange `users.events`) и health на `MAILER_HOST`:`MAILER_PORT` (по умолчанию `127.0.0.1:3001`). После `register` (и создания пользователя через OAuth) `users` эмитит `user.created`; mailer асинхронно шлёт письмо с текстом «Вы зарегистрировались на платформе». GraphQL-регистрация от SMTP не зависит и уже успешна, даже если письмо не ушло.

Без `NODEMAILER_USER_TRANSPORT` / `NODEMAILER_PASSWORD_TRANSPORT` / `NODEMAILER_FROM` mailer стартует, но письма не отправляет: событие подтверждается, очередь не травится. Когда SMTP задан, временные ошибки транспорта логируются и сообщение не ack (повторная доставка).

Переменные SMTP в `.env` (см. `.env.example`): `NODEMAILER_USER_TRANSPORT`, `NODEMAILER_PASSWORD_TRANSPORT`, `NODEMAILER_FROM`. Хост и порт SMTP не задаются снаружи: `smtp.gmail.com:465` с TLS. HTTP health: `MAILER_HOST` и `MAILER_PORT` (по умолчанию `127.0.0.1:3001`). Публичные API на `0.0.0.0` не биндить. Нужен тот же `RABBITMQ_URL`, что и у `users`.

`NODEMAILER_FROM` задавайте как `"Имя" <email@gmail.com>` — одно отображаемое имя без адреса SMTP часто отклоняет.

## GraphQL

Playground / GraphiQL: [http://localhost:3000/graphql](http://localhost:3000/graphql) (откройте в браузере; GraphiQL отдаётся на GET с `Accept: text/html`).

Примеры:

```graphql
mutation {
  register(input: { email: "a@example.com", password: "password1", name: "Ann" }) {
    accessToken
    refreshToken
    user { id email name }
  }
}

mutation {
  login(input: { email: "a@example.com", password: "password1" }) {
    accessToken
    refreshToken
  }
}

query {
  me { id email name avatarUrl }
}
```

Для `me` нужен заголовок `Authorization: Bearer <accessToken>`. Без токена — 401.

## OAuth (Google / GitHub)

Браузер не может завершить OAuth через GraphQL, поэтому на gateway есть HTTP:

- `GET /auth/google` и `GET /auth/google/callback`
- `GET /auth/github` и `GET /auth/github/callback`

После успеха gateway отдаёт HTML с токенами или редирект на `OAUTH_SUCCESS_REDIRECT_URL` (токены в hash).

Логин/пароль работают без OAuth-секретов. Чтобы OAuth заработал:

1. Создайте приложения в Google Cloud / GitHub.
2. Укажите callback: `http://localhost:3000/auth/google/callback` (и аналог для GitHub).
3. Для доступа из интернета используйте ngrok и выставьте `OAUTH_CALLBACK_BASE_URL` на публичный HTTPS-URL ngrok.

## Инварианты

- Новый микросервис — только `pnpm exec nest generate app <name>`.
- Публичный API — только GraphQL-резолверы gateway.
- Синхронно — gRPC, асинхронно — RabbitMQ.
- У каждого сервиса своя Prisma-БД (логическая БД в одном Postgres).
- Gateway имеет только read-model, не source of truth. Mailer без БД.
- gRPC не публиковать наружу (`127.0.0.1`). Mailer HTTP — `MAILER_HOST`/`MAILER_PORT` (по умолчанию localhost, не `0.0.0.0`).
- Каждый gRPC-вызов несёт `x-internal-token`.
- После JWT gateway передаёт `user-id` в metadata, клиентский user id не доверяем.
- Не коммитить и не читать секреты из `.env` / `config.json`.
- Общий код из `apps/*` импортировать как `@libs/common` / `@libs/proto`, не через `../../../libs`. Новая lib: `nest generate library` + `package.json` с `"name": "@libs/<name>"` + `workspace:*`.

## Скрипты

- `pnpm run start:all` / `pnpm run start:all:dev` — весь стек в watch (concurrently)
- `pnpm run start:all:prod` — prod-сборка без `.d.ts`/`.js.map`, затем весь стек из `dist/`
- `pnpm run start:gateway` / `pnpm run start:users` / `pnpm run start:mailer` — по отдельности (watch)
- `pnpm run start:prod` / `pnpm run start:gateway:prod` / `pnpm run start:users:prod` / `pnpm run start:mailer:prod` — по отдельности из `dist/`
- `pnpm run prisma:generate` — клиенты users и gateway
- `pnpm run prisma:migrate` — миграции БД `users`
- `pnpm run prisma:migrate:gateway` — миграции БД `gateway`
- `pnpm run build:gateway` / `pnpm run build:users` / `pnpm run build:mailer` — с sourceMap
- `pnpm run build:gateway:prod` / `pnpm run build:users:prod` / `pnpm run build:mailer:prod` — без `.d.ts` и `.js.map`
- `pnpm lint` / `pnpm run lint:fix`
