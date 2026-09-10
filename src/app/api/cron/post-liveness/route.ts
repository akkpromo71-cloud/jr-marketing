import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logError } from '@/lib/log-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Раз в сутки проверяем, что опубликованный ролик ещё существует, и помечаем
// заявку post_missing, если ссылка отдаёт «страницы нет». Защита — тот же
// CRON_SECRET, что и у /api/cron/tiktok-stats.
//
// ponytail: живость определяется только по HTTP-коду (404/410 = поста нет).
// TikTok на удалённое видео иногда отдаёт 200 с заглушкой — такие случаи этой
// проверкой не ловятся. Более точный признак — разбор самой страницы, но он
// упирается в ту же блокировку серверных запросов, из-за которой сейчас не
// работает сбор просмотров (см. src/lib/tiktok.ts). Апгрейд — когда появится
// официальный доступ к TikTok API.
const DEAD_STATUSES = new Set([404, 410]);

async function isMissing(url: string): Promise<boolean | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
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
    // 403 / 429 / 5xx — это про нас, а не про пост: ничего не меняем.
    return null;
  } catch {
    // Сеть отвалилась или таймаут — тоже не повод объявлять пост пропавшим.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  const { data: rows, error } = await supabase
    .from('applications')
    .select('id, posted_url')
    .not('posted_url', 'is', null);

  if (error) {
    logError('cron/post-liveness:select', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (rows ?? []) as { id: string; posted_url: string }[];
  let missing = 0;
  let alive = 0;
  let skipped = 0;

  const CONCURRENCY = 4;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (item) => {
        const result = await isMissing(item.posted_url);
        if (result === null) {
          skipped += 1;
          return;
        }
        if (result) missing += 1;
        else alive += 1;
        const { error: updateError } = await supabase
          .from('applications')
          .update({ post_missing: result, post_checked_at: new Date().toISOString() })
          .eq('id', item.id);
        if (updateError) logError('cron/post-liveness:update', updateError, { id: item.id });
      })
    );
  }

  return NextResponse.json({ checked: items.length, alive, missing, skipped });
}
