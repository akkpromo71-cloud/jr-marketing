import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getViewStatsProvider } from '@/lib/view-providers';
import { fetchTikTokSoundVideoCount } from '@/lib/tiktok';
import { checkUrlAlive } from '@/lib/post-liveness';
import { logError } from '@/lib/log-error';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Раз в сутки (см. vercel.json): по каждой принятой работе — снимок
// просмотров (начисление считает record_view_snapshot по приросту, см.
// supabase/migrations/0005_view_engine.sql), проверка живости поста, и
// отдельно — число видео со звуком для музыкальных кампаний. Защита —
// тот же CRON_SECRET, что и у остальных кронов.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  const { error: expireError } = await supabase.rpc('expire_slots');
  if (expireError) logError('cron/clipping-stats:expire_slots', expireError);

  const { data: rows, error } = await supabase
    .from('submissions')
    .select('id, url, platform')
    .eq('status', 'approved');

  if (error) {
    logError('cron/clipping-stats:select', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (rows ?? []) as { id: string; url: string; platform: Platform }[];
  let snapshotted = 0;
  let noStats = 0;
  let removed = 0;

  const CONCURRENCY = 4;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (item) => {
        const provider = getViewStatsProvider(item.platform);
        const stats = await provider(item.url);
        if (stats) {
          const { error: rpcError } = await supabase.rpc('record_view_snapshot', {
            p_submission_id: item.id,
            p_views: stats.views,
            p_likes: stats.likes,
            p_source: 'auto',
          });
          if (rpcError) logError('cron/clipping-stats:record_view_snapshot', rpcError, { id: item.id });
          else snapshotted += 1;
        } else {
          noStats += 1;
        }

        const alive = await checkUrlAlive(item.url);
        if (alive === true) {
          const { error: removeError } = await supabase.rpc('mark_submission_removed', {
            p_submission_id: item.id,
          });
          if (removeError) logError('cron/clipping-stats:mark_submission_removed', removeError, { id: item.id });
          else removed += 1;
        }
      })
    );
  }

  // Использования звука — только у музыкальных кампаний (track_sound_url задан),
  // ещё не закрытых.
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, track_sound_url')
    .not('track_sound_url', 'is', null)
    .not('status', 'in', '(finished)');

  let soundSnapshots = 0;
  if (campaignsError) {
    logError('cron/clipping-stats:campaigns-select', campaignsError);
  } else {
    for (const campaign of campaigns ?? []) {
      const count = await fetchTikTokSoundVideoCount(campaign.track_sound_url as string);
      if (count === null) continue;
      const { error: insertError } = await supabase
        .from('sound_usage_snapshots')
        .insert({ campaign_id: campaign.id, videos_count: count });
      if (insertError) logError('cron/clipping-stats:sound-insert', insertError, { campaignId: campaign.id });
      else soundSnapshots += 1;
    }
  }

  if (noStats > 0) {
    logError('cron/clipping-stats:summary', new Error(`${noStats} of ${items.length} submissions had no stats`), {
      checked: items.length,
      snapshotted,
      noStats,
      removed,
    });
  }

  return NextResponse.json({ checked: items.length, snapshotted, noStats, removed, soundSnapshots });
}
