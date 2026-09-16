# Микросервисный монорепозиторий NestJS

Публичный API — GraphQL на `gateway`. Сервис `users` доступен только по gRPC (localhost) и публикует события в RabbitMQ. Сервис `files` хранит аватары в MinIO и метаданные в PostgreSQL. Сервис `payments` создаёт checkout Stripe/PayPal и принимает webhook-и провайдеров. Сервис `mailer` слушает `user.created` и отправляет письма (без gRPC и без БД). Gateway хранит только read-model публичного профиля (не source of truth).

## Стек

- NestJS 12 (монорепозиторий), pnpm, ESLint
- GraphQL (Apollo, code-first) на gateway
- gRPC (`libs/proto/src/auth.proto`, `libs/proto/src/files.proto`, `libs/proto/src/payments.proto`) — `users`, `files` и `payments`
- Prisma + PostgreSQL: логические БД `users` (источник истины), `files` (метаданные загрузок), `payments` (платежи) и `gateway` (проекция профиля)
- MinIO (S3) — бакет `avatars`, локально порты 9000/9001
- RabbitMQ: topic-exchange `users.events` (`user.created`, `user.updated`, `user.authenticated`) и `payments.events` (`payment.completed`, `payment.failed`, `payment.canceled`)
- nodemailer (`mailer`) — welcome-письмо при регистрации

## Структура

```text
apps/gateway      — публичный GraphQL + OAuth HTTP + проекция профиля
apps/users        — gRPC-сервис пользователей (Prisma) + consumer payment.completed
apps/files        — gRPC-сервис файлов (Prisma + MinIO)
apps/payments     — gRPC checkout + HTTP webhook Stripe/PayPal (Prisma)
apps/mailer       — consumer RabbitMQ, SMTP (nodemailer)
apps/web-client   — Next.js (браузерный клиент к GraphQL gateway)
libs/proto        — protobuf-контракты (`@libs/proto`)
libs/common       — токены клиентов, события, маппинг RpcException (`@libs/common`)
```

## Как запустить

1. Скопируйте `.env.example` в `.env` и заполните значения (не коммитьте `.env`). Если `.env` уже есть — добавьте новые ключи `FILES_*`, `S3_*` и `PAYMENTS_*` / Stripe / PayPal из шаблона (`FILES_GRPC_URL` и `PAYMENTS_GRPC_URL` нужны и gateway).
2. Установите зависимости: `pnpm install`.
3. Поднимите инфраструктуру:

```bash
docker compose up -d
```

Если Postgres уже создавался раньше (том `postgres_data`), `init.sql` повторно не выполнится. Создайте логические БД вручную:

```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE gateway;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE files;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE payments;"
```

4. Примените миграции Prisma:

```bash
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:migrate:gateway
pnpm run prisma:migrate:files
pnpm run prisma:migrate:payments
```

5. Запустите все сервисы одной командой:

```bash
pnpm run start:all
```

`start:all` и `start:all:dev` поднимают `users`, `mailer`, `files`, `payments` и `gateway` параллельно через [concurrently](https://github.com/open-cli-tools/concurrently) (`pnpm run start:users` / `start:mailer` / `start:files` / `start:payments` / `start:gateway`). Префиксы логов: `users`, `mailer`, `files`, `payments`, `gateway`. Падение одного процесса остальные не гасит. Ctrl+C останавливает всех детей. Для собранного режима: `pnpm run start:all:prod` (сначала `build:*:prod` без `.d.ts`/`.js.map`, затем процессы из `dist/`). Docker Compose — Postgres, RabbitMQ и MinIO, не Node-процессы.

Новый сервис: `pnpm exec nest generate app <name>`, скрипт `start:<name>` (и при необходимости `start:<name>:prod` / `build:<name>:prod`) и ещё одна команда в `concurrently` в `start:all` / `start:all:prod`.

Если при старте EADDRINUSE (порты 3000 / 3001 / 3002 / 3003 / 4000 / 50051 / 50052 / 50053 заняты) — остановите предыдущий `start:all` / `start:web` или процессы на этих портах вручную.

По отдельности: `pnpm run start:users`, `pnpm run start:mailer`, `pnpm run start:files`, `pnpm run start:payments` и `pnpm run start:gateway`. Фронт: `pnpm run start:web` (Next.js на порту 4000, в `start:all` не входит).

## Порты

| Сервис             | Адрес                           | Назначение                                                                                  |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| Gateway            | `http://localhost:3000`         | GraphQL и OAuth                                                                             |
| GraphQL Playground | `http://localhost:3000/graphql` | IDE в режиме development                                                                    |
| Web client         | `http://localhost:4000`         | Next.js, `pnpm run start:web`                                                               |
| Mailer health      | `http://127.0.0.1:3001/health`  | `MAILER_HOST`:`MAILER_PORT` (по умолчанию localhost), внутренний HTTP                       |
| Files health       | `http://127.0.0.1:3002/health`  | `FILES_HOST`:`FILES_PORT` (по умолчанию localhost), внутренний HTTP                         |
| Payments health    | `http://127.0.0.1:3003/health`  | `PAYMENTS_HOST`:`PAYMENTS_PORT` (по умолчанию localhost), webhook HTTP                      |
| Users gRPC         | `127.0.0.1:50051`               | Только localhost, не публиковать                                                            |
| Files gRPC         | `127.0.0.1:50052`               | Только localhost, не публиковать                                                            |
| Payments gRPC      | `127.0.0.1:50053`               | Только localhost, не публиковать                                                            |
| PostgreSQL         | `localhost:5433`                | БД `users`, `gateway`, `files` и `payments` (порт хоста 5433, чтобы не пересечься с локальным Postgres) |
| MinIO API          | `http://localhost:9000`         | S3-совместимое хранилище, бакет `avatars`                                                   |
| MinIO Console      | `http://localhost:9001`         | UI MinIO (`minioadmin` / `minioadmin` локально)                                             |
| RabbitMQ           | `localhost:5672`                | AMQP                                                                                        |
| RabbitMQ UI        | `http://localhost:15672`        | guest/guest                                                                                 |

## CQRS на gateway

Источник истины — Prisma `users` (пароль, OAuth, refresh-токены, `accountTier`). На gateway в БД `gateway` лежит только публичный профиль: `id`, `email`, `name`, `avatarUrl`, `accountTier`.

- Команды (`register` / `login` / `refresh` / `logout` / OAuth / `updateMe` / `uploadAvatar`) всегда идут в доменные сервисы по gRPC. Если `users` или `files` недоступен — ошибка.
- `me` сначала вызывает gRPC с коротким timeout. При `UNAVAILABLE` / `DEADLINE_EXCEEDED` (и аналогах транспорта) отдаётся проекция, если запись уже есть.
- После успешного gRPC (register/login/oauth/refresh/`me`/`updateMe`/`uploadAvatar`) gateway сразу пишет проекцию (write-through). Дополнительно `users` публикует `user.created` (полный публичный профиль) при создании пользователя и `user.updated` при последующем oauth-update и `UpdateMe`.

В `.env` нужна `GATEWAY_DATABASE_URL` (шаблон в `.env.example`).

## Почта (mailer)

`mailer` не публикует gRPC и GraphQL: только consumer очереди `mailer.users-events` (binding `user.created` на exchange `users.events`) и health на `MAILER_HOST`:`MAILER_PORT` (по умолчанию `127.0.0.1:3001`). После `register` (и создания пользователя через OAuth) `users` эмитит `user.created`; mailer асинхронно шлёт письмо с текстом «Вы зарегистрировались на платформе». GraphQL-регистрация от SMTP не зависит и уже успешна, даже если письмо не ушло.

Без `NODEMAILER_USER_TRANSPORT` / `NODEMAILER_PASSWORD_TRANSPORT` / `NODEMAILER_FROM` mailer стартует, но письма не отправляет: событие подтверждается, очередь не травится. События старше 24 ч и ошибки SMTP тоже ack. Очередь `mailer.users-events` — не архив: TTL 24 ч и максимум 10 000 сообщений, иначе при остановленном mailer она росла бы бесконечно.

Переменные SMTP в `.env` (см. `.env.example`): `NODEMAILER_USER_TRANSPORT`, `NODEMAILER_PASSWORD_TRANSPORT`, `NODEMAILER_FROM`. Хост и порт SMTP не задаются снаружи: `smtp.gmail.com:465` с TLS. HTTP health: `MAILER_HOST` и `MAILER_PORT` (по умолчанию `127.0.0.1:3001`). Публичные API на `0.0.0.0` не биндить. Нужен тот же `RABBITMQ_URL`, что и у `users`.

`NODEMAILER_FROM` задавайте как `"Имя" <email@gmail.com>` — одно отображаемое имя без адреса SMTP часто отклоняет.

## GraphQL

Playground / GraphiQL: [http://localhost:3000/graphql](http://localhost:3000/graphql) (откройте в браузере; GraphiQL отдаётся на GET с `Accept: text/html`).

Примеры:

```graphql
mutation {
  register(
    input: { email: "a@example.com", password: "password1", name: "Ann" }
  ) {
    accessToken
    refreshToken
    user {
      id
      email
      name
    }
  }
}

mutation {
  login(input: { email: "a@example.com", password: "password1" }) {
    accessToken
    refreshToken
  }
}

query {
  me {
    id
    email
    name
    avatarUrl
    accountTier
  }
}

mutation {
  updateMe(
    input: {
      name: "Ann"
      avatarUrl: "http://localhost:9000/avatars/u1/file.jpg"
    }
  ) {
    id
    email
    name
    avatarUrl
  }
}
```

`updateMe` и `uploadAvatar` требуют `Authorization: Bearer <accessToken>`. Без токена — 401. Id пользователя берётся из JWT, не из GraphQL-входа.

Загрузка аватара — GraphQL multipart (`Upload`). Playground/GraphiQL файл может не принять из‑за CSRF Apollo 5; используйте curl и заголовок `Apollo-Require-Preflight`:

```bash
curl http://localhost:3000/graphql \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Apollo-Require-Preflight: true" \
  -F operations='{"query":"mutation ($file: Upload!) { uploadAvatar(file: $file) { id email avatarUrl } }","variables":{"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@./avatar.png
```

Лимит 2MB, MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Gateway вызывает `files.UploadFile`, затем `users.UpdateMe({ avatarUrl })`.

Для `me` нужен заголовок `Authorization: Bearer <accessToken>`. Без токена — 401.

## Платежи (payments)

Разовая покупка PREMIUM: GraphQL на gateway, checkout и webhook — сервис `payments`. Сумму клиент не присылает (Product `PREMIUM`, 9.99 USD). Уже купленный PREMIUM → ошибка `CONFLICT`. Живой `PENDING` того же провайдера возвращает тот же `checkoutUrl`.

```graphql
mutation {
  createCheckout(input: { provider: STRIPE }) {
    paymentId
    checkoutUrl
    provider
    status
  }
}

query {
  myPayments {
    id
    productCode
    provider
    status
    amountMinor
    currency
    checkoutUrl
    createdAt
  }
}
```

`createCheckout` и `myPayments` требуют `Authorization: Bearer <accessToken>`. User id берётся из JWT. После успешной оплаты webhook помечает платёж `SUCCEEDED`, `users` ставит `accountTier=PREMIUM`, gateway проекция обновляется через `user.updated`.

Webhook HTTP (не GraphQL, не gateway):

- `POST http://127.0.0.1:3003/webhooks/stripe`
- `POST http://127.0.0.1:3003/webhooks/paypal`

Локальная проверка Stripe: `stripe listen --forward-to localhost:3003/webhooks/stripe`, секрет `whsec_...` в `STRIPE_WEBHOOK_SECRET`, карта `4242`. PayPal sandbox — Client ID/Secret, публичный URL (ngrok) на `/webhooks/paypal`, `PAYPAL_WEBHOOK_ID`. Подробный чеклист: `apps/payments/README.md`.

Браузерный клиент (`apps/web-client`) ходит на тот же `/graphql`. Gateway отвечает CORS с `CORS_ORIGIN` (по умолчанию `http://localhost:4000`).

## OAuth (Google / GitHub)

Браузер не может завершить OAuth через GraphQL, поэтому на gateway есть HTTP:

- `GET /auth/google` и `GET /auth/google/callback`
- `GET /auth/github` и `GET /auth/github/callback`

Кнопки Google / GitHub на `/login` и `/register` ведут на эти REST-маршруты gateway (полный редирект браузера, не GraphQL). Callback у провайдера: `http://localhost:3000/auth/google/callback` и `http://localhost:3000/auth/github/callback`. После успеха gateway отдаёт HTML с токенами или редирект на `OAUTH_SUCCESS_REDIRECT_URL` (по умолчанию `http://localhost:4000/auth/callback`, токены в hash). Фронт читает hash, кладёт refresh в httpOnly-cookie и открывает `/`. Если пользователь отменил согласие, callback редиректит на `/login?error=oauth`.

Логин/пароль работают без OAuth-секретов. Чтобы OAuth заработал:

1. Создайте приложения в Google Cloud / GitHub.
2. Укажите callback: `http://localhost:3000/auth/google/callback` (и аналог для GitHub).
3. Задайте `OAUTH_SUCCESS_REDIRECT_URL=http://localhost:4000/auth/callback` (как в `.env.example`) и перезапустите gateway.
4. Для доступа из интернета используйте ngrok и выставьте `OAUTH_CALLBACK_BASE_URL` на публичный HTTPS-URL ngrok.

## Инварианты

- Новый микросервис — только `pnpm exec nest generate app <name>`. Фронт `apps/web-client` — Next.js, не Nest.
- Публичный API — только GraphQL-резолверы gateway. Исключения REST: OAuth на gateway и webhook-и payments (`/webhooks/stripe`, `/webhooks/paypal`).
- Синхронно — gRPC, асинхронно — RabbitMQ.
- У каждого сервиса своя Prisma-БД (логическая БД в одном Postgres).
- Gateway имеет только read-model, не source of truth. Mailer без БД.
- gRPC не публиковать наружу (`127.0.0.1`). Mailer HTTP — `MAILER_HOST`/`MAILER_PORT` (по умолчанию localhost, не `0.0.0.0`).
- Каждый gRPC-вызов несёт `x-internal-token`.
- После JWT gateway передаёт `user-id` в metadata, клиентский user id не доверяем.
- Не коммитить и не читать секреты из `.env` / `config.json`.
- Общий код из `apps/*` импортировать как `@libs/common` / `@libs/proto`, не через `../../../libs`. Новая lib: `nest generate library` + `package.json` с `"name": "@libs/<name>"` + `workspace:*`.

## Скрипты

- `pnpm run start:all` / `pnpm run start:all:dev` — бэкенд-стек в watch (concurrently): users, mailer, files, payments, gateway
- `pnpm run start:all:prod` — prod-сборка без `.d.ts`/`.js.map`, затем весь стек из `dist/`
- `pnpm run start:gateway` / `pnpm run start:users` / `pnpm run start:mailer` / `pnpm run start:files` / `pnpm run start:payments` — по отдельности (watch)
- `pnpm run start:web` — Next.js на порту 4000 (`apps/web-client`)
- `pnpm run start:prod` / `pnpm run start:gateway:prod` / `pnpm run start:users:prod` / `pnpm run start:mailer:prod` / `pnpm run start:files:prod` / `pnpm run start:payments:prod` / `pnpm run start:web:prod` — по отдельности из сборки
- `pnpm run prisma:generate` — клиенты users, gateway, files и payments
- `pnpm run prisma:migrate` — миграции БД `users`
- `pnpm run prisma:migrate:gateway` — миграции БД `gateway`
- `pnpm run prisma:migrate:files` — миграции БД `files`
- `pnpm run prisma:migrate:payments` — миграции БД `payments`
- `pnpm run build:gateway` / `pnpm run build:users` / `pnpm run build:mailer` / `pnpm run build:files` / `pnpm run build:payments` — с sourceMap
- `pnpm run build:gateway:prod` / `pnpm run build:users:prod` / `pnpm run build:mailer:prod` / `pnpm run build:files:prod` / `pnpm run build:payments:prod` — без `.d.ts` и `.js.map`
- `pnpm run build:web` — сборка Next.js
- `pnpm lint` / `pnpm run lint:fix` — ESLint бэкенда
- `pnpm run lint:web` — ESLint `apps/web-client`
