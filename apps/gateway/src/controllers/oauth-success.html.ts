export function renderOauthSuccessHtml(
  accessToken: string,
  refreshToken: string,
): string {
  const safeAccess = escapeHtml(accessToken);
  const safeRefresh = escapeHtml(refreshToken);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Вход выполнен</title>
    <style>
      body { font-family: sans-serif; max-width: 720px; margin: 40px auto; }
      code { word-break: break-all; display: block; background: #f4f4f4; padding: 12px; }
    </style>
  </head>
  <body>
    <h1>OAuth-вход выполнен</h1>
    <p>Скопируйте токены в GraphQL Playground (заголовок Authorization: Bearer).</p>
    <h2>accessToken</h2>
    <code>${safeAccess}</code>
    <h2>refreshToken</h2>
    <code>${safeRefresh}</code>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
