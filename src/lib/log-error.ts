// Единая точка логирования ошибок — вместо разрозненных console.error по
// всему коду. Работает и на сервере (Server Actions, Route Handlers), и на
// клиенте (error.tsx — Client Component), поэтому этот файл НЕ должен
// импортировать ничего серверного (next/headers и т.п.) — иначе он сломает
// сборку точно так же, как уже случилось в этом проекте с ui.tsx/error.tsx
// (см. историю коммитов "Fix: move StatusBadge out of ui.tsx — broke prod
// build via error.tsx"). Простой модуль без серверных зависимостей — самая
// надёжная защита от повтора той же ошибки.
//
// Пишет структурированную JSON-строку в console.error — на сервере она видна
// в Vercel: Project -> Functions -> Logs (или `vercel logs`). Сюда же в
// будущем можно подключить внешний мониторинг (например, Sentry), не трогая
// вызовы logError() по всему остальному коду — только этот файл. Официальный
// и самый надёжный способ подключить Sentry к Next.js — мастер
// `npx @sentry/wizard@latest -i nextjs` (сам создаёт нужные конфиг-файлы под
// установленную версию SDK и аккуратно правит next.config.mjs) — писать эти
// конфиги руками не стали: слишком велик риск незаметно сломать сборку на
// проде, как уже случалось в этом проекте, а проверить такую правку в этой
// песочнице без доступа к npm-реестру нечем.
export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: 'error',
      context,
      message,
      stack,
      extra,
      timestamp: new Date().toISOString(),
    })
  );
}

