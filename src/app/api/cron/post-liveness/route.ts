import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkUrlAlive } from '@/lib/post-liveness';
import { logError } from '@/lib/log-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Раз в сутки проверяем, что опубликованный ролик ещё существует, и помечаем
// заявку post_missing, если ссылка отдаёт «страницы нет». Защита — тот же
// CRON_SECRET, что и у /api/cron/tiktok-stats.
async function isMissing(url: string): Promise<boolean | null> {
  return checkUrlAlive(url);
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
