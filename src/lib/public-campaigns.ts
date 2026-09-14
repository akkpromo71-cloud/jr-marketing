import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Campaign } from '@/lib/types';

// Список открытых кампаний для публичной витрины (/campaigns, дифференциатор
// №7) — тот же приём, что и в src/lib/landing-stats.ts: клиент на анонимном
// ключе без cookies(), обёрнутый в unstable_cache. Без этого каждый заход
// анонима на страницу без аккаунта бил бы в Supabase заново — а это как раз
// самая вероятная точка входа нового трафика (в неё явно ведут с лендинга).
// RLS/grants те же, что уже разрешают anon читать campaigns (см.
// supabase/migrations/0003_clipping_platform.sql, patch-grants.sql).
export const getPublicCampaigns = unstable_cache(
  async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['funded', 'active'])
      .order('created_at', { ascending: false });
    return (data ?? []) as (Campaign & { id: string })[];
  },
  ['public-campaigns'],
  { revalidate: 30 }
);
