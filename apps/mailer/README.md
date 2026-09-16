# Mailer

Асинхронный сервис писем. Слушает очередь RabbitMQ `mailer.users-events` (binding `user.created` на topic-exchange `users.events`), SMTP — nodemailer. HTTP только внутренний health на `MAILER_HOST`:`MAILER_PORT` (по умолчанию `127.0.0.1:3001`). gRPC, GraphQL и БД отсутствуют. Публичные API на `0.0.0.0` не биндить — по умолчанию localhost.

## Запуск

Из корня репозитория (после `docker compose up` и заполненного `.env`):

```bash
pnpm run start:mailer
```

Health: `http://127.0.0.1:3001/health` (`MAILER_HOST` и `MAILER_PORT`, по умолчанию `127.0.0.1:3001`).

## События

- `user.created` — welcome-письмо («Вы зарегистрировались на платформе»). В payload есть публичный профиль; mailer использует только `email`.

Routing не доставляет mailer другие ключи (`user.updated`, `user.authenticated`).

Регистрация на gateway не ждёт SMTP и уже успешна, даже если письмо не ушло. Невалидный email и события старше 24 ч пропускаются (ack). Сама очередь не архив: после ack сообщение удаляется. Пока consumer не подтвердил — RabbitMQ держит его на диске. Чтобы очередь не росла без mailer, у `mailer.users-events` стоит TTL 24 ч (`x-message-ttl`) и потолок 10 000 сообщений (`x-max-length`, overflow `drop-head` — вытесняются самые старые).

Без `NODEMAILER_USER_TRANSPORT` / `NODEMAILER_PASSWORD_TRANSPORT` / `NODEMAILER_FROM` mailer стартует, welcome не шлёт, сообщение подтверждается — очередь не травится. Ошибки SMTP логируются, сообщение тоже ack: nack крутил бы одно и то же письмо бесконечно (Gmail уже мог его принять).

Если mailer не стартует с `PRECONDITION_FAILED` на очереди — аргументы durable-очереди нельзя сменить на месте. Удалите `mailer.users-events` в RabbitMQ (UI `:15672` или `docker compose exec rabbitmq rabbitmqctl delete_queue mailer.users-events`); при следующем старте очередь создастся с TTL.

## SMTP

Переменные: `NODEMAILER_USER_TRANSPORT`, `NODEMAILER_PASSWORD_TRANSPORT`, `NODEMAILER_FROM`. Хост и порт не задаются снаружи: `smtp.gmail.com:465` с TLS.

`NODEMAILER_FROM` задавайте в виде `"Имя" <email@gmail.com>` — отображаемое имя без адреса SMTP часто отклоняет.
