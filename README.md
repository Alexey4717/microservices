# Микросервисный монорепозиторий NestJS

Публичный API — GraphQL на `gateway`. Сервис `users` доступен только по gRPC (localhost) и публикует события в RabbitMQ. Сервис `files` хранит аватары в MinIO и метаданные в PostgreSQL. Сервис `payments` создаёт checkout Stripe/PayPal и принимает webhook-и провайдеров. Сервис `telegram` принимает webhook Telegram и привязывает бота к существующему аккаунту через gRPC `users`. Сервис `mailer` слушает `user.created` и отправляет письма (без gRPC и без БД). Gateway хранит только read-model публичного профиля (не source of truth).

## Стек

- NestJS 12 (монорепозиторий), pnpm, ESLint
- GraphQL (Apollo, code-first) на gateway; подписки — graphql-sse (SSE), не WebSocket
- gRPC (`libs/proto/src/auth.proto`, `libs/proto/src/files.proto`, `libs/proto/src/payments.proto`) — `users`, `files` и `payments`
- Prisma + PostgreSQL: логические БД `users` (источник истины), `files` (метаданные загрузок), `payments` (платежи) и `gateway` (проекция профиля)
- MinIO (S3) — бакет `avatars`, локально порты 9000/9001
- RabbitMQ: topic-exchange `users.events` (`user.created`, `user.updated`, `user.authenticated`, `user.telegram.updated`) и `payments.events` (`payment.completed`, `payment.failed`, `payment.canceled`)
- nodemailer (`mailer`) — welcome-письмо при регистрации

## Структура

```text
apps/gateway      — публичный GraphQL + OAuth HTTP + проекция профиля
apps/users        — gRPC-сервис пользователей (Prisma) + consumer payment.completed
apps/files        — gRPC-сервис файлов (Prisma + MinIO)
apps/payments     — gRPC checkout + HTTP webhook Stripe/PayPal (Prisma)
apps/telegram     — HTTP webhook Telegram + gRPC-клиент к users (без своей БД)
apps/mailer       — consumer RabbitMQ, SMTP (nodemailer)
apps/web-client   — Next.js (браузерный клиент к GraphQL gateway)
apps/telegram-mini-app — Vite + React Mini App (порт 4001, не Nest)
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

`start:all` и `start:all:dev` поднимают `users`, `mailer`, `files`, `payments`, `telegram` и `gateway` параллельно через [concurrently](https://github.com/open-cli-tools/concurrently) (`pnpm run start:users` / `start:mailer` / `start:files` / `start:payments` / `start:telegram` / `start:gateway`). Префиксы логов: `users`, `mailer`, `files`, `payments`, `telegram`, `gateway`. Падение одного процесса остальные не гасит. Ctrl+C останавливает всех детей. Для собранного режима: `pnpm run start:all:prod` (сначала `build:*:prod` без `.d.ts`/`.js.map`, затем процессы из `dist/`). Docker Compose — Postgres, RabbitMQ и MinIO, не Node-процессы.

Новый сервис: `pnpm exec nest generate app <name>`, скрипт `start:<name>` (и при необходимости `start:<name>:prod` / `build:<name>:prod`) и ещё одна команда в `concurrently` в `start:all` / `start:all:prod`.

Если при старте EADDRINUSE (порты 3000 / 3001 / 3002 / 3003 / 3004 / 4000 / 4001 / 50051 / 50052 / 50053 заняты) — остановите предыдущий `start:all` / `start:web` / `start:telegram-mini` или процессы на этих портах вручную.

По отдельности: `pnpm run start:users`, `pnpm run start:mailer`, `pnpm run start:files`, `pnpm run start:payments`, `pnpm run start:telegram` и `pnpm run start:gateway`. Фронт: `pnpm run start:web` (Next.js на порту 4000, в `start:all` не входит). Telegram Mini App: `pnpm run start:telegram-mini` (Vite на порту 4001, в `start:all` не входит).

Публичный HTTPS-туннель ngrok **не** стартует вместе со стеком. Скрипт поднимает **пакетный** `ngrok` из `node_modules`, а не системный агент: глобальный `ngrok config` ему не подходит, нужен `NGROK_AUTHTOKEN` в `.env` (см. `.env.example`). В отдельном терминале:

```bash
pnpm run ngrok:dev
pnpm run ngrok:dev -- 3003
pnpm run ngrok:dev -- 3004
pnpm run ngrok:dev -- 4001
```

Порт: первый аргумент CLI, иначе `PORT`, иначе `3000`. Бесплатный ngrok держит один туннель (inspector `:4040`): если туннель уже смотрит на gateway, остановите его перед туннелем payments/telegram/Mini App.

Скопируйте **полный** https-URL, включая суффикс `.ngrok-free.app` (например `https://xxxx.ngrok-free.app`). TUI может переносить строку Forwarding — обрезанный хост без `.ngrok-free.app` в браузере даёт `ERR_NAME_NOT_RESOLVED`. Тот же URL печатает скрипт и показывает Web Interface `http://127.0.0.1:4040`. Открывайте https, не http. Для `:3000` gateway должен уже слушать порт (`pnpm run start:all`). Подсказки в логе: GraphQL на 3000, Stripe/PayPal webhook на 3003, Telegram webhook на 3004, Mini App + GraphQL proxy на 4001.

## Порты

| Сервис             | Адрес                           | Назначение                                                                                  |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| Gateway            | `http://localhost:3000`         | GraphQL и OAuth                                                                             |
| GraphQL Playground | `http://localhost:3000/graphql` | IDE в режиме development                                                                    |
| Web client         | `http://localhost:4000`         | Next.js, `pnpm run start:web`                                                               |
| Telegram Mini App  | `http://localhost:4001`         | Vite + React, `pnpm run start:telegram-mini`                                                |
| Mailer health      | `http://127.0.0.1:3001/health`  | `MAILER_HOST`:`MAILER_PORT` (по умолчанию localhost), внутренний HTTP                       |
| Files health       | `http://127.0.0.1:3002/health`  | `FILES_HOST`:`FILES_PORT` (по умолчанию localhost), внутренний HTTP                         |
| Payments health    | `http://127.0.0.1:3003/health`  | `PAYMENTS_HOST`:`PAYMENTS_PORT` (по умолчанию localhost), webhook HTTP                      |
| Telegram health    | `http://127.0.0.1:3004/health`  | `TELEGRAM_HOST`:`TELEGRAM_PORT` (по умолчанию localhost), webhook HTTP                      |
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

mutation {
  loginWithTelegram(initData: "query_id=...&user=...&auth_date=...&hash=...") {
    accessToken
    user {
      id
      email
      name
      avatarUrl
      accountTier
    }
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
  payment(id: $id) {
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

`createCheckout`, `payment` и `myPayments` требуют `Authorization: Bearer <accessToken>`. User id берётся из JWT. После checkout Stripe/PayPal возвращают на `/payments/:id` (UUID нашего платежа). Пока статус `PENDING`, web-client опрашивает `payment(id)`. После успешной оплаты webhook помечает платёж `SUCCEEDED`, `users` ставит `accountTier=PREMIUM`, gateway проекция обновляется через `user.updated`.

Origin фронта — `CORS_ORIGIN` (тот же, что для CORS gateway); path/query игнорируются, success и cancel переписываются в `{CORS_ORIGIN}/payments/{paymentId}`.

Webhook HTTP (не GraphQL, не gateway):

- `POST http://127.0.0.1:3003/webhooks/stripe`
- `POST http://127.0.0.1:3003/webhooks/paypal`

Локальная проверка Stripe: `stripe listen --forward-to localhost:3003/webhooks/stripe`, секрет `whsec_...` в `STRIPE_WEBHOOK_SECRET`, карта `4242`. PayPal sandbox — Client ID/Secret, публичный URL (ngrok) на `/webhooks/paypal`, `PAYPAL_WEBHOOK_ID`. Подробный чеклист: `apps/payments/README.md`.

Gateway отвечает CORS с `CORS_ORIGIN` (по умолчанию `http://localhost:4000`) и, если задан, origin из `TELEGRAM_MINI_APP_URL`. Return URL Stripe/PayPal по-прежнему только `{CORS_ORIGIN}/payments/:id`.

## Telegram

Привязка бота к уже существующему аккаунту (пользователей из Telegram не создаём). GraphQL на gateway, webhook — сервис `telegram` на `:3004`.

```graphql
mutation {
  createTelegramLink {
    url
  }
}
```

`createTelegramLink` требует `Authorization: Bearer <accessToken>`. User id берётся из JWT. Gateway запрашивает одноразовый токен у `users` и собирает `https://t.me/<TELEGRAM_BOT_USERNAME>?start=link_<token>`. Токен бота на gateway не нужен, достаточно `TELEGRAM_BOT_USERNAME`. После привязки `me.telegram` отдаёт снимок (`userId`, `username`, `firstName`, `userLastName`, `photoUrl`); `photoUrl` — публичный URL из files, не Bot API.

Подписка (не WebSocket):

```graphql
subscription {
  telegramLinked {
    ok
  }
}
```

`telegramLinked` требует тот же Bearer, что и `me`. Транспорт — graphql-sse, distinct connections: GET/POST `http://localhost:3000/graphql` с `Accept: text/event-stream`. После `Start` в Telegram `users` шлёт `user.telegram.updated`; gateway отдаёт событие только этому пользователю. Веб-клиент заново запрашивает `me` (карточка профиля). Подсказка «?» на непривязанной карточке: ссылка 10 минут, повторный клик инвалидирует старую.

Webhook HTTP (не GraphQL, не gateway):

- `POST http://127.0.0.1:3004/webhooks/telegram`

Локально: `pnpm run ngrok:dev -- 3004`, затем `TELEGRAM_WEBHOOK_URL=https://<host>/webhooks/telegram` при старте telegram. Секрет — заголовок `X-Telegram-Bot-Api-Secret-Token`. Кнопка «Привязать Telegram» — на `/profile`.

Mini App (`apps/telegram-mini-app`, порт 4001): `pnpm run start:telegram-mini`, затем `pnpm run ngrok:dev -- 4001`. Публичный URL → `TELEGRAM_MINI_APP_URL` и BotFather. Вход — GraphQL `loginWithTelegram(initData)` (HMAC на `users`, токен бота на gateway не нужен). В обычном браузере по тому же URL — только экран «откройте в Telegram». Подробности: `apps/telegram/README.md` и `apps/telegram-mini-app/README.md`.

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

- Новый микросервис — только `pnpm exec nest generate app <name>`. Фронт `apps/web-client` — Next.js, не Nest. Mini App `apps/telegram-mini-app` — Vite + React, не Nest.
- Публичный API — только GraphQL-резолверы gateway. Исключения REST: OAuth на gateway, webhook-и payments (`/webhooks/stripe`, `/webhooks/paypal` на payments) и Telegram webhook (`/webhooks/telegram` на сервисе telegram, не на gateway).
- Синхронно — gRPC, асинхронно — RabbitMQ.
- У каждого сервиса своя Prisma-БД (логическая БД в одном Postgres).
- Gateway имеет только read-model, не source of truth. Mailer без БД.
- gRPC не публиковать наружу (`127.0.0.1`). Mailer HTTP — `MAILER_HOST`/`MAILER_PORT` (по умолчанию localhost, не `0.0.0.0`).
- Каждый gRPC-вызов несёт `x-internal-token`.
- После JWT gateway передаёт `user-id` в metadata, клиентский user id не доверяем.
- Не коммитить и не читать секреты из `.env` / `config.json`.
- Общий код из `apps/*` импортировать как `@libs/common` / `@libs/proto`, не через `../../../libs`. Новая lib: `nest generate library` + `package.json` с `"name": "@libs/<name>"` + `workspace:*`.

## Скрипты

- `pnpm run start:all` / `pnpm run start:all:dev` — бэкенд-стек в watch (concurrently): users, mailer, files, payments, telegram, gateway
- `pnpm run start:all:prod` — prod-сборка без `.d.ts`/`.js.map`, затем весь стек из `dist/`
- `pnpm run start:gateway` / `pnpm run start:users` / `pnpm run start:mailer` / `pnpm run start:files` / `pnpm run start:payments` / `pnpm run start:telegram` — по отдельности (watch)
- `pnpm run start:web` — Next.js на порту 4000 (`apps/web-client`)
- `pnpm run start:telegram-mini` — Vite Mini App на порту 4001 (`apps/telegram-mini-app`), в `start:all` не входит
- `pnpm run ngrok:dev` — туннель ngrok (отдельный терминал, не входит в `start:all`): порт = аргумент CLI / `PORT` / 3000; для Mini App — `-- 4001`
- `pnpm run start:prod` / `pnpm run start:gateway:prod` / `pnpm run start:users:prod` / `pnpm run start:mailer:prod` / `pnpm run start:files:prod` / `pnpm run start:payments:prod` / `pnpm run start:telegram:prod` / `pnpm run start:web:prod` — по отдельности из сборки
- `pnpm run prisma:generate` — клиенты users, gateway, files и payments
- `pnpm run prisma:migrate` — миграции БД `users`
- `pnpm run prisma:migrate:gateway` — миграции БД `gateway`
- `pnpm run prisma:migrate:files` — миграции БД `files`
- `pnpm run prisma:migrate:payments` — миграции БД `payments`
- `pnpm run build:gateway` / `pnpm run build:users` / `pnpm run build:mailer` / `pnpm run build:files` / `pnpm run build:payments` / `pnpm run build:telegram` — с sourceMap
- `pnpm run build:gateway:prod` / `pnpm run build:users:prod` / `pnpm run build:mailer:prod` / `pnpm run build:files:prod` / `pnpm run build:payments:prod` / `pnpm run build:telegram:prod` — без `.d.ts` и `.js.map`
- `pnpm run build:web` — сборка Next.js
- `pnpm run build:telegram-mini` — сборка Mini App
- `pnpm lint` / `pnpm run lint:fix` — ESLint бэкенда
- `pnpm run lint:web` — ESLint `apps/web-client`
- `pnpm run lint:telegram-mini` — ESLint `apps/telegram-mini-app`
- `pnpm run format:web` / `pnpm run format:telegram-mini` — Prettier фронтов
