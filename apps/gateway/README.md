# Gateway

Публичный GraphQL API (Apollo, code-first). Есть только read-model публичного профиля (Prisma, логическая БД `gateway`) — не source of truth. Команды аутентификации ходят в `users` по gRPC. Проекция синхронизируется write-through после успешного gRPC и событиями RabbitMQ: `user.created` пишет полный публичный профиль, `user.updated` — последующие oauth-update.

Исходники в `src/` сгруппированы по типу (`resolvers/`, `loaders/`, `controllers/`, `services/`, `guards/` и т.д.), а не по фичам. Новые GraphQL-резолверы кладите в `resolvers/`.

## DataLoader

Вложенное поле, которое берётся из другого контура, чем родитель, и повторяется в списке, резолвится через `@ResolveField` и класс в `src/loaders/`. Пример: `Video.author` — имя и аватар из локальной проекции пользователя, не из ответа files.

Лоадер не нужен, если данные уже пришли в ответе родительского запроса (платежи, диалоги ассистента) или поле одно и в списке не повторяется.

Новый лоадер — `@Injectable()` в `loaders/`. Внутри общий `RequestLoader`: фабрика `() => DataLoader` и `WeakMap` по объекту `GqlContext` (один контекст — один лоадер, ключ — ссылка на контекст запроса, не user id). Батч возвращает массив той же длины и в том же порядке, что ключи. Класс регистрируется в `AppModule`. В `@ResolveField` резолвер вызывает `loader.get(context).load(id)`.

Лоадер не кладётся на `GqlContext` (контекст остаётся `{ req, res }`) и не хранится полем синглтона резолвера: иначе кэш переживёт запрос. Кэш живёт один GraphQL-запрос. Другой пользователь и повторный запрос получают другой объект контекста и другой лоадер. После завершения запроса `WeakMap` контекст не удерживает.

## Запуск

Из корня репозитория (после `docker compose up`, `pnpm run prisma:migrate:gateway` и `pnpm run start:users`):

```bash
pnpm run start:gateway
```

Порт: `3000` (`PORT` в `.env`). GraphQL Playground в development: `/graphql`. Нужны `GATEWAY_DATABASE_URL` и `RABBITMQ_URL`. CORS: `CORS_ORIGIN` (по умолчанию `http://localhost:4000` для `apps/web-client`) плюс origin `TELEGRAM_MINI_APP_URL`, если задан. `credentials: true`, чтобы браузер мог принять cookie сессии. Return URL Stripe/PayPal по-прежнему считаются из `CORS_ORIGIN`, не из Mini App.

## GraphQL

Стоимость запроса ограничена переменной `GRAPHQL_MAX_COMPLEXITY` (если не задана — 100): каждое поле по умолчанию стоит 1. Запрос дороже лимита отклоняется с текстом `Query is too complex: N. Maximum allowed: M` и `extensions.code` = `GRAPHQL_COMPLEXITY_LIMIT`; gateway пишет warn с именем операции, стоимостью и лимитом. В development успешный ответ дополняется `extensions.complexity` и `extensions.maxComplexity`, в production этих полей нет. В development `IntrospectionQuery` не ограничивается лимитом, чтобы GraphiQL загружал схему; в production лимит для этого запроса действует как для остальных. Тот же лимит проверяется для подписок graphql-sse: при превышении ответ 400 JSON, поток не открывается.

Мутации: `register`, `login`, `loginWithTelegram`, `refresh`, `logout`, `updateMe`, `uploadAvatar`.  
Запрос: `me` — только с `Authorization: Bearer`, иначе 401. Если `users` временно недоступен, `me` отдаёт проекцию при уже записанном профиле.

`loginWithTelegram(initData: String!)` — публичный вход Mini App. Gateway проксирует `initData` в users gRPC; токен бота на gateway не кладётся. Cookie refresh пишется как у `login`.

`updateMe(input: UpdateMeInput!)` меняет `name` и/или `avatarUrl` текущего пользователя (id из JWT). `uploadAvatar(file: Upload!)` — multipart, лимит 2MB; затем gateway ставит `avatarUrl` через `UpdateMe`. Пример curl — в корневом README. Нужны `FILES_GRPC_URL` и `USERS_GRPC_URL`.

После успешного `register` / `login` / `refresh` gateway пишет httpOnly-cookie `refresh-token` (`Path=/`, `SameSite=Lax`, `Secure` только в production, `maxAge` из `JWT_REFRESH_TTL`). `Domain` не задаётся. `refresh` ротирует токен: старый отзывается, в Set-Cookie приходит новый. `logout` вызывает `clearCookie` для `refresh-token`.

`refresh` и `logout` читают токен из cookie; поле `input.refreshToken` опционально (для Playground). Если нет ни cookie, ни input — 401. Access token по-прежнему возвращается в теле ответа; cookie — источник refresh-токена для веб-клиента.

## Подписки (GraphQL SSE)

`telegramLinked: TelegramLinkedPayload` (`{ ok: Boolean! }`). JWT как у `me` (`Authorization: Bearer`); событие только своему user id из токена, клиентский user id не принимается.

Транспорт — **graphql-sse**, distinct connections (GET/POST `/graphql` с `Accept: text/event-stream`), не WebSocket `graphql-ws` и не отдельный REST `/sse`. Nest GraphQL 14 из коробки даёт только `graphql-ws`; SSE подключён рядом с Apollo на том же `/graphql`. CORS: `CORS_ORIGIN` (+ origin Mini App) + credentials, заголовок `Last-Event-ID` разрешён.

Сигнал приходит из RabbitMQ `user.telegram.updated` (очередь `gateway.user-projections`, binding `user.#`) в in-process PubSub. Клиент по событию заново запрашивает `me`.

## OAuth HTTP

Это единственный публичный REST на gateway:

- `GET /auth/google`, `GET /auth/google/callback`
- `GET /auth/github`, `GET /auth/github/callback`

Секреты Google/GitHub опциональны при старте. Без них парольный логин работает, OAuth-провайдер отклонит запрос.

После успеха, если задан `OAUTH_SUCCESS_REDIRECT_URL` (для веб-клиента: `http://localhost:4000/auth/callback`), gateway редиректит туда с токенами в hash. Отмена согласия на callback уводит на `{origin}/login?error=oauth`.

`GET /auth/google?client=mobile` и `GET /auth/github?client=mobile` передают провайдеру фиксированный OAuth `state=mobile` (не произвольный URL). Если на callback `state=mobile`, успех редиректит на `MOBILE_OAUTH_SUCCESS_REDIRECT_URL` (если переменная пустая — `mobile://auth/callback`) с `accessToken` и `refreshToken` в hash. Ошибка или отмена для этого клиента ведёт на `mobile://login?error=oauth`. Без `client=mobile` веб-поведение не меняется.

Для туннеля запустите `pnpm run ngrok:dev` в отдельном терминале и задайте `OAUTH_CALLBACK_BASE_URL` на публичный **https**-URL ngrok целиком, включая `.ngrok-free.app`.

## gRPC-клиент

`USERS_GRPC_URL` (по умолчанию `127.0.0.1:50051`) и `FILES_GRPC_URL` (`127.0.0.1:50052`). Каждый вызов:

- metadata `x-internal-token` = `INTERNAL_SERVICE_TOKEN`
- после JWT — metadata `user-id` (не из тела запроса клиента) для `GetMe`, `UpdateMe`, `UploadFile`

JWT проверяется на gateway тем же `JWT_SECRET`, что и в `users`.
