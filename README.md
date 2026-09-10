# Микросервисный монорепозиторий NestJS

Публичный API — GraphQL на `gateway`. Сервис `users` доступен только по gRPC (localhost) и публикует события в RabbitMQ.

## Стек

- NestJS 12 (монорепозиторий), pnpm, ESLint
- GraphQL (Apollo, code-first) на gateway
- gRPC (`libs/proto/src/auth.proto`)
- Prisma + PostgreSQL (`users`)
- RabbitMQ (события `user.created`, `user.authenticated`)

## Структура

```text
apps/gateway   — публичный GraphQL + OAuth HTTP
apps/users     — gRPC-сервис пользователей (Prisma)
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

4. Примените миграции Prisma (схема `apps/users/prisma`):

```bash
pnpm run prisma:generate
pnpm run prisma:migrate
```

5. Запустите все сервисы одной командой:

```bash
pnpm run start:all
```

`start:all` и `start:all:dev` запускают `node scripts/start-all.mjs dev` (users и gateway в `--watch`, sourceMap включён). Для собранного режима: `pnpm run start:all:prod` (`node scripts/start-all.mjs prod` — сначала `build:*:prod` без `.d.ts`/`.js.map`, затем `dist/`).

Порядок и порты задаются в `scripts/services.mjs`, а не отдельными npm-скриптами. Оркестратор стартует зависимости, ждёт TCP через [wait-on](https://github.com/jeffbski/wait-on) (таймаут 60 с) и только потом поднимает зависимые сервисы. Логи с префиксами `[users]` / `[gateway]`. Если любой процесс упал или wait истек — остальные завершаются, скрипт падает. Docker Compose по-прежнему только для Postgres и RabbitMQ, не для Node-процессов.

Новый сервис: `pnpm exec nest generate app <name>`, затем строка в `scripts/services.mjs` (`port`, `build` → `build:<name>:prod`, при необходимости `waitFor`). Скрипты `wait:*` / `start:after-*` не добавлять.

Если при старте EADDRINUSE (порты 3000 / 50051 заняты старым Nest) — остановите предыдущий `start:all` или выполните `pnpm run start:all -- --kill-ports`. Без этого флага оркестратор не убивает чужие процессы и падает с PID.

По отдельности (два терминала): `pnpm run start:users` и `pnpm run start:gateway`.

## Порты

| Сервис | Адрес | Назначение |
| --- | --- | --- |
| Gateway | `http://localhost:3000` | GraphQL и OAuth |
| GraphQL Playground | `http://localhost:3000/graphql` | IDE в режиме development |
| Users gRPC | `127.0.0.1:50051` | Только localhost, не публиковать |
| PostgreSQL | `localhost:5433` | БД `users` (порт хоста 5433, чтобы не пересечься с локальным Postgres) |
| RabbitMQ | `localhost:5672` | AMQP |
| RabbitMQ UI | `http://localhost:15672` | guest/guest |

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
- Gateway без БД.
- gRPC не публиковать наружу (`127.0.0.1`).
- Каждый gRPC-вызов несёт `x-internal-token`.
- После JWT gateway передаёт `user-id` в metadata, клиентский user id не доверяем.
- Не коммитить и не читать секреты из `.env` / `config.json`.
- Общий код из `apps/*` импортировать как `@libs/common` / `@libs/proto`, не через `../../../libs`. Новая lib: `nest generate library` + `package.json` с `"name": "@libs/<name>"` + `workspace:*`.

## Скрипты

- `pnpm run start:all` / `pnpm run start:all:dev` — весь стек в watch (`scripts/start-all.mjs`)
- `pnpm run start:all:prod` — prod-сборка без `.d.ts`/`.js.map`, затем весь стек из `dist/`
- `pnpm run start:all -- --kill-ports` — то же, с освобождением портов стека
- `pnpm run start:gateway` / `pnpm run start:users` — по отдельности (watch)
- `pnpm run start:prod` / `pnpm run start:users:prod` — по отдельности из `dist/`
- `pnpm run prisma:migrate`
- `pnpm run build:gateway` / `pnpm run build:users` — с sourceMap
- `pnpm run build:gateway:prod` / `pnpm run build:users:prod` — без `.d.ts` и `.js.map`
- `pnpm lint` / `pnpm run lint:fix`
