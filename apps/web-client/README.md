# Web client

Браузерный клиент на Next.js. Ходит только на публичный GraphQL gateway (`http://localhost:3000/graphql`).

## Сессия

Refresh-токен живёт в httpOnly-cookie `refresh-token`. Её **выставляет gateway**, а Next только проксирует `Cookie` / `Set-Cookie` (в том числе ротацию после `refresh` и `clearCookie` после `logout`). Access token **не** кладётся в `localStorage` / `sessionStorage` и **не** пишется в cookie: на сервере он живёт в памяти запроса (`getSession()` / `React.cache`), на клиенте — в памяти `ApolloWrapper`.

`proxy.ts` проверяет наличие cookie (редирект на `/login` или с auth-страниц) и один раз за пользовательский запрос вызывает тот же `loadSession()`, чтобы записать ротированную cookie в ответ. Prefetch и Server Actions refresh не делают — иначе два параллельных `refresh` отзывают токен и выбрасывают на логин. Layout `app/(app)/layout.tsx` берёт сессию через `getSession()` и показывает аватар и имя рядом с «Выйти».

## Аватар

На `/profile` можно выбрать JPEG, PNG, WebP или GIF (до 2 МБ). Клиент проверяет MIME и размер **до** запроса. Файл уходит на gateway мутацией `uploadAvatar` как GraphQL multipart (`Upload`), с `Authorization: Bearer` и `Apollo-Require-Preflight: true`. После успеха сессия обновляется, новое фото видно в профиле и в шапке.

## Маршруты

| Путь        | Назначение                             |
| ----------- | -------------------------------------- |
| `/login`    | Вход по email и паролю                 |
| `/register` | Регистрация (имя необязательно)        |
| `/`         | Главная (нужна cookie `refresh-token`) |
| `/profile`  | RSC `query Me`, загрузка аватара       |
| `/videos`   | Заглушка                               |

Без cookie запросы кроме `/login` и `/register` уходят на `/login`. С cookie эти две страницы редиректят на `/`.

## Запуск

Сначала поднимите бэкенд из корня репозитория (`pnpm run start:all`), затем фронт:

```bash
pnpm run start:web
```

Или из каталога приложения: `pnpm --filter web-client dev`.

Откройте [http://localhost:4000](http://localhost:4000).

Шаблон переменных — `.env.example` (`NEXT_PUBLIC_GRAPHQL_URL`). Не коммитьте `.env`.

## Скрипты из корня

| Команда                   | Назначение            |
| ------------------------- | --------------------- |
| `pnpm run start:web`      | `next dev` на 4000    |
| `pnpm run build:web`      | `next build`          |
| `pnpm run start:web:prod` | `next start` на 4000  |
| `pnpm run lint:web`       | ESLint этого пакета   |
| `pnpm run format:web`     | Prettier этого пакета |

Корневые `pnpm lint` / `format` / тесты Nest `apps/web-client` не трогают.
