# Мобильное приложение

Expo Router (React Native) для того же кабинета, что и сайт: вход, регистрация, главная, заглушка видео, профиль, заказ оплаты. ИИ-ассистента нет. Пакет не Nest и не входит в `nest-cli.json`. В `start:all` не входит.

Порт Metro: **8081**.

## Запуск

Из корня репозитория, после `pnpm install` и запущенного gateway (`pnpm run start:all` или `pnpm run start:gateway`):

```bash
pnpm run start:mobile
```

Нативная сборка Android (схема `mobile`, нужна для OAuth):

```bash
pnpm --filter mobile exec expo run:android
```


## GraphQL

Все операции — готовые документы `@libs/graphql` через Apollo Client. Новый codegen не нужен.

Адрес задаётся `EXPO_PUBLIC_GRAPHQL_URL`.

| Где открыто приложение      | URL                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Эмулятор Android            | `http://10.0.2.2:3000/graphql` (значение по умолчанию, `10.0.2.2` — это localhost компьютера)              |
| Телефон в той же сети       | `http://<IP компьютера>:3000/graphql`, например `EXPO_PUBLIC_GRAPHQL_URL=http://192.168.1.10:3000/graphql` |
| Expo Web на этом компьютере | `http://localhost:3000/graphql`                                                                            |

Для эмулятора переменную можно не задавать. На телефоне `10.0.2.2` и `localhost` указывают на само устройство, не на gateway.

Access-токен хранится в памяти. Refresh — в `expo-secure-store`. В Expo Web SecureStore недоступен, refresh остаётся только в памяти на время вкладки.

## OAuth

Кнопки Google и GitHub открывают `http://<gateway>/auth/google?client=mobile` и тот же путь для GitHub через `expo-web-browser`. Gateway возвращает приложение на `mobile://auth/callback` с токенами в hash. Отмена — `mobile://login?error=oauth`.

Схема `mobile` работает в сборке `expo run:android` / `expo run:ios`, не в Expo Go. В `.env` gateway добавьте `MOBILE_OAUTH_SUCCESS_REDIRECT_URL=mobile://auth/callback` (см. `.env.example`) и перезапустите gateway.

Оплата Stripe/PayPal по-прежнему возвращает браузер на сайт (`CORS_ORIGIN/payments/:id`). Приложение сразу открывает экран заказа и опрашивает статус, пока он `PENDING`.

## Скрипты

```bash
pnpm run start:mobile
pnpm run build:mobile
pnpm run lint:mobile
pnpm run format:mobile
```
