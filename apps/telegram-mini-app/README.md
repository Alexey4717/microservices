# Telegram Mini App

Отдельный React SPA (Vite) для кабинета в Telegram Mini App. Это **не** Nest-приложение и **не** Next.js: пакет не входит в `nest-cli.json`, не импортирует `@libs/*` и ходит только в публичный GraphQL gateway.

Порт **4001** (`4000` занят `web-client`). В `start:all` не входит.

## Запуск

Из корня репозитория (gateway уже должен слушать `:3000`):

```bash
pnpm run start:telegram-mini
```

Vite проксирует `/graphql` → `http://localhost:3000/graphql`. Mini App вызывает **относительный** `/graphql`, не `localhost:3000`. С телефона `localhost` недоступен: нужен один публичный туннель на `:4001`.

```bash
pnpm run ngrok:dev -- 4001
```

Скопируйте полный HTTPS-URL (включая `.ngrok-free.app`) в `TELEGRAM_MINI_APP_URL` корневого `.env` и в BotFather (Menu Button / Direct Mini App). URL кнопки меню — **origin Mini App** (`https://<ngrok-host>`), без `#`, без `/videos`. Бесплатный ngrok держит **один** туннель: если уже открыт `:3004` (webhook бота) или `:3000`, остановите его. Пока туннель смотрит на Mini App, ранее зарегистрированный webhook Telegram может перестать обновляться.

Отдельный туннель на gateway `:3000` для Mini App не нужен: GraphQL с телефона идёт на `https://<ngrok>/graphql`, Vite проксирует на локальный gateway.

После изменения `vite.config.ts` **перезапустите** `pnpm run start:telegram-mini`: уже запущенный Vite не подхватит `server.allowedHosts`. Без этого ngrok-хост получит `403 This host is not allowed`, а в Telegram WebView это выглядит как белый экран.

Нужны одновременно:

1. `pnpm run start:telegram-mini` (Vite на `:4001`)
2. `pnpm run ngrok:dev -- 4001` (HTTPS на тот же порт)
3. Menu Button / `TELEGRAM_MINI_APP_URL` = HTTPS-origin этого туннеля

## Маршруты

- `/` — упрощённый профиль: аватар (`alt`), email, имя, тариф. Без загрузки аватара, PREMIUM checkout, платежей и кнопки «Привязать Telegram».
- `/videos` — заглушка «видео».
- Нижняя навигация «Профиль» / «Видео» (`aria-label`).
- На `/videos` показывается `Telegram.WebApp.BackButton` → назад на профиль.
- `start_param=videos` из `initData` открывает `/videos`.

Маршрутизация — `MemoryRouter`: Telegram кладёт `tgWebAppData` в `location.hash`, это не должно становиться путём SPA.

## Вход

Мутация `loginWithTelegram(initData: String!)` на gateway. Access token хранится **в памяти** WebView (cookie в Mini App ненадёжны), запрос `me` идёт с `Authorization: Bearer`. Пользователя из Telegram не создаём: сначала привяжите бота в профиле на сайте.

Пока идёт вход, на экране «Загрузка…». Если `loginWithTelegram` / `me` падает — тот же полноэкранный текст с ошибкой, не пустой WebView.

## Гейт браузера

Если `Telegram.WebApp.initData` пустой (и в hash нет `tgWebAppData`), кабинет **не** монтируется и GraphQL **не** вызывается. Полноэкранный текст: «Для корректной работы откройте приложение в Telegram».

У `KeyboardButton.web_app` (кнопка над полем ввода) **нет** `initData`. Если открыли Mini App из reply-клавиатуры «Кабинет» внутри Telegram, показывается: «Откройте кабинет кнопкой под сообщением». Рабочий вход — inline-кнопка «Открыть кабинет» под ответом бота на `/start` или кнопка меню BotFather, если её URL — origin Mini App.

Это защита UX, не секрет: подпись `initData` проверяет сервис `users` (HMAC-SHA256 `WebAppData`).

## Тема Telegram

Подключается `telegram-web-app.js`, вызываются `ready()` и `expand()` (в том числе на гейте и ошибке). CSS-переменные берутся из `themeParams` и обновляются по `themeChanged`; пустые значения заменяются запасными цветами, чтобы не было белого текста на белом фоне. Отступы — `safeAreaInset` / `contentSafeAreaInset` (`--tg-safe-area-*`, `--tg-content-safe-area-*`). Вёрстка mobile-first.

Android User-Agent `Telegram-Android/...; LOW`: на `<html>` ставится `data-perf="low"`, лишние анимации отключаются. Иначе короткие переходы (~60fps) и `prefers-reduced-motion`.

## Команды

```bash
pnpm run start:telegram-mini
pnpm run build:telegram-mini
pnpm run lint:telegram-mini
pnpm run format:telegram-mini
```
