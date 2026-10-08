# AI Assistant

Приватный сервис чата с моделью. Публичный GraphQL — только на gateway: `aiConversations`, `aiConversation`, `createAiConversation`, `confirmAiAction`, `rejectAiAction`, подписка `aiAssistantReply`. Между gateway и сервисом — gRPC, ответ модели идёт server stream. Браузер получает токены через graphql-sse, не через WebSocket.

HTTP на ai-assistant — только `GET /health`. gRPC слушает `127.0.0.1:50054`. Публичные API на `0.0.0.0` не биндить.

Исходники сгруппированы по типу (`controllers/`, `services/`). User id берётся из metadata `user-id`, не из текста клиента и не из аргументов модели.

## После внедрения

Образ Postgres в `docker-compose.yml` — `pgvector/pgvector:pg16`, том данных тот же. Если контейнер уже был создан на `postgres:16`, пересоздайте его на новый образ, том можно оставить:

```bash
docker compose up -d --force-recreate postgres
```

Миграция сама выполняет `CREATE EXTENSION IF NOT EXISTS vector` в базе `ai_assistant`. Если том старый и миграция уже применена до смены образа, расширение можно создать вручную:

```bash
docker compose exec postgres psql -U postgres -d ai_assistant -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Если том Postgres уже существовал до появления базы, `init.sql` не создаст её повторно:

```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE ai_assistant;"
```

Дальше:

```bash
pnpm run prisma:generate
pnpm run prisma:migrate:ai-assistant
pnpm run build:ai-assistant
pnpm --filter @apps/ai-assistant run knowledge:ingest
pnpm run start:all
```

`knowledge:ingest` читает markdown из `apps/ai-assistant/knowledge`, режет на чанки с перекрытием и пишет эмбеддинги. Его нет в `pnpm lint` и `build:services`: команда запускается отдельно, после сборки сервиса. Если модель эмбеддингов недоступна или таблица пустая, чат отвечает без справки.

Скопируйте новые ключи из `.env.example` в локальный `.env` (не коммитьте `.env`):

- `LLM_TEMPERATURE` — температура, если клиент её не передал. По умолчанию `0.2`, на сервере значение зажимается в `0..1`.
- `LLM_EMBED_MODEL` и `LLM_EMBED_DIMENSIONS` — модель и размерность эмбеддингов справки.
- `AI_ASSISTANT_DAILY_TOKEN_LIMIT=0` снимает дневной лимит. Токены сводки истории учитываются так же, как обычный вызов модели.

Модель по умолчанию — локальная Ollama: `LLM_BASE_URL=http://127.0.0.1:11434/v1`, `LLM_MODEL=gemma4:12b`.

Проверка: login → страница `/ai-assistant` или кнопка «Ассистент» → новый диалог → сообщение. Ответ дописывается в последнюю реплику ассистента. Над ответом короткая строка вызванных инструментов. Ползунок температуры уходит в подписку вместе с текущим путём страницы.

## Методы AiAssistantService (`package ai_assistant`)

- `CreateConversation` / `ListConversations` / `GetConversation` — unary. Чужой `conversationId` не читается и не пишется. В деталях диалога приходят ожидающие кнопки действия.
- `SendMessage` — server stream. Кроме `delta` и `done` событие может нести имя инструмента и карточку действия (`id`, тип, заголовок). Поля необязательные: старый клиент их не запрашивает. В запрос можно передать `pagePath` и `temperature`.
- `ConfirmAction` / `RejectAction` — подтверждение и отказ. Чужое действие не находится. Оплата и смена имени выполняются только здесь, от имени user id сессии.

Инструменты чтения: `get_my_profile` и `list_my_payments` (не больше 20 последних). Мутации модель не выполняет: `propose_checkout`, `propose_navigation` и `propose_update_name` только создают ожидающее действие. Переход по странице делает клиент по пути, который вернул сервер. Оплата открывается по `checkoutUrl`, карту в чате не проводят.

Когда в контекст не помещается старая история, отброшенный и ещё не покрытый кусок один раз суммируется отдельным вызовом без инструментов. Текст и маркер последнего покрытого сообщения хранятся на диалоге и дальше входят в системный промпт.

Поиск справки идёт по общей таблице `KnowledgeChunk` (pgvector), без фильтра по user id.

gRPC требует `x-internal-token`. Health HTTP — нет.

## Оценка на локальной модели

Набор вопросов: `eval/cases.json`. Скрипт печатает совпадения ожидаемого инструмента, пути, провайдера, имени или источника статьи. В `pnpm lint` и `build:services` он не входит.

```bash
pnpm run build:ai-assistant
pnpm --filter @apps/ai-assistant run eval
```
