// Общая проверка «жив ли пост» для обоих кронов (музыкальный флоу и
// клиппинг) — см. использование в src/app/api/cron/post-liveness/route.ts и
// src/app/api/cron/clipping-stats/route.ts.
//
// ponytail: живость определяется только по HTTP-коду (404/410 = поста нет).
// Площадки иногда отдают 200 с заглушкой на удалённое видео — такие случаи
// этой проверкой не ловятся. Более точный признак — разбор самой страницы,
// но он упирается в ту же блокировку серверных запросов, из-за которой
// нестабилен сбор просмотров (см. src/lib/tiktok.ts). Апгрейд — когда
// появится официальный доступ к API площадок.
const DEAD_STATUSES = new Set([404, 410]);

// true = поста нет, false = жив, null = не удалось определить (сеть/лимиты) —
// в этом случае вызывающий код не должен ничего менять.
export async function checkUrlAlive(url: string, timeoutMs = 8000): Promise<boolean | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (DEAD_STATUSES.has(res.status)) return true;
    if (res.ok) return false;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
