import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchTikTokStats } from '@/lib/tiktok';
import { logError } from '@/lib/log-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Дёргается кроном Vercel раз в сутки (см. vercel.json) и обновляет
// просмотры/лайки у всех заявок, где эдитор оставил ссылку на опубликованный
// эдит. Защищена секретом CRON_SECRET — Vercel сам подставляет заголовок
// Authorization при вызове по расписанию, вручную по этому адресу не зайти.
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
    logError('cron/tiktok-stats:select', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (rows ?? []) as { id: string; posted_url: string }[];

  let updated = 0;
  let failed = 0;

  // Небольшими пачками параллельно: быстрее, чем строго по одной ссылке,
  // но не долбим TikTok сотнями запросов разом.
  const CONCURRENCY = 4;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        const stats = await fetchTikTokStats(item.posted_url);
        if (!stats) return false;
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            views_count: stats.views,
            likes_count: stats.likes,
            result_updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        return !updateError;
      })
    );
    for (const ok of results) {
      if (ok) updated += 1;
      else failed += 1;
    }
  }

  // "failed" тут — либо TikTok не отдал цифры (см. logError внутри
  // fetchTikTokStats — там уже отличили реальный сбой от "пока нет данных"),
  // либо не прошло само обновление строки в БД. Отдельно логируем только
  // сводку по всему прогону крона, чтобы было видно в Vercel Function Logs,
  // если доля неудач стала подозрительно большой.
  if (failed > 0) {
    logError('cron/tiktok-stats:summary', new Error(`${failed} of ${items.length} updates failed`), {
      checked: items.length,
      updated,
      failed,
    });
  }

  return NextResponse.json({ checked: items.length, updated, failed });
}
