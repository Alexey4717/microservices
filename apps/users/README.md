# Users

Приватный gRPC-сервис. HTTP наружу не слушает. Данные — Prisma + PostgreSQL (логическая БД `users`). События — RabbitMQ (публикация в topic-exchange `users.events`, не в общую work-queue). Исходники сгруппированы по типу (`controllers/`, `services/`, `interceptors/`), а не по фичам.

## Запуск

```bash
docker compose up -d
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run start:users
```

gRPC: `127.0.0.1:50051` (не `0.0.0.0`). Postgres с хоста: порт **5433** (`DATABASE_URL` в `.env.example`).

## Методы AuthService (`package auth`)

- `Register` / `Login` / `OauthUpsert` / `Refresh` / `Logout` / `GetMe` / `UpdateMe` / `GetMeByTelegram` / `CreateTelegramLinkToken` / `ConsumeTelegramLinkToken` / `UpsertTelegramProfile`

`UpdateMe` меняет `name` и/или `avatarUrl` текущего пользователя. Id только из metadata `user-id`. Пустая строка `avatarUrl` сбрасывает аватар в `null`. Нужно хотя бы одно поле. После успеха публикуется `user.updated`.

`OauthUpsert` создаёт или обновляет `User` + `OAuthAccount`. Если пользователь с таким email уже есть, аккаунт привязывается к нему. `passwordHash` может быть `null` (только OAuth). Провайдеры `OauthUpsert` — только `google` и `github` (нужен email). Telegram сюда не входит.

Telegram привязывается отдельно: `CreateTelegramLinkToken` берёт `user-id` только из metadata, TTL ~10 мин, в БД хранится SHA-256 хеш (`TelegramLinkToken`); повторный выпуск в одной транзакции удаляет все прежние токены этого пользователя (ссылка `t.me?start=link_...` сразу недействительна). `ConsumeTelegramLinkToken` одноразовый: пишет `OAuthAccount` с `provider = "telegram"` и `providerAccountId` = telegram user id, заготовку `TelegramProfile` (1:1 с `User`) и удаляет строку токена. Пользователя из Telegram не создаём. Если этот telegram id уже у другого пользователя — `ALREADY_EXISTS`; повтор для того же пользователя — идемпотентный успех. Истёкшие и уже использованные (`usedAt`) строки периодически чистятся джобой в users (`TELEGRAM_LINK_TOKEN_CLEANUP_INTERVAL_MS`, по умолчанию 15 мин; при `NODE_ENV=test` или `0` задача не стартует). `GetMeByTelegram` ищет по `OAuthAccount`, колонки `telegram_user_id` на `User` нет.

Снимок профиля Telegram (`TelegramProfile`) хранится только в БД users:

- `userId` — FK на `User` (уникальный, 1:1)
- `telegramUserId` — числовой id Telegram (как `OAuthAccount.providerAccountId`)
- `username` — @handle без `@`
- `firstName` — колонка `user_name`
- `lastName` — колонка `user_last_name`
- `photoUrl` — колонка `photo_url`, публичный URL (S3/MinIO), **не** URL Bot API с токеном

`UpsertTelegramProfile` принимает снимок от сервиса `telegram` (токен бота в users не нужен). URL с `api.telegram.org` отбрасывается. `GetMe` отдаёт `telegram`, если аккаунт привязан, иначе поле отсутствует.

## События

Публикация в exchange `users.events` (topic):

- `user.created` — после регистрации и после создания пользователя через OAuth. Payload: публичный профиль (`userId`, `email`, `name`, `avatarUrl`, `occurredAt`). Mailer берёт только `email`; gateway пишет полную проекцию.
- `user.updated` — когда пользователя не создают, а обновляют профиль (повторный OAuth / привязка аккаунта / `UpdateMe`). Очередь gateway: `gateway.user-projections`, binding `user.#`.
- `user.telegram.updated` — после успешного `ConsumeTelegramLinkToken` и `UpsertTelegramProfile`. Payload: `{ userId, occurredAt }` (без токенов). Gateway поднимает GraphQL-подписку `telegramLinked`.
- `user.authenticated` — после login и OAuth (отдельные очереди на этот ключ не подписаны)

## Безопасность

Глобальный interceptor отклоняет вызовы без `x-internal-token`. `GetMe`, `UpdateMe` и `CreateTelegramLinkToken` берут id только из metadata `user-id`. Refresh-токены и telegram link-токены хранятся в виде SHA-256 хеша.
