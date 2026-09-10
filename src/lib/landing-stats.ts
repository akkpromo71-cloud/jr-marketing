import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Публичные цифры лендинга: security-definer RPC, одинаковые для всех анонимов
// (залогиненных редиректит раньше). Кэшируем на 5 минут — данные меняются
// редко, а «/» — самый нагруженный маршрут: без кэша это три обращения к
// Supabase на каждый заход. Клиент без cookies: unstable_cache не даёт читать
// cookies, а этим RPC они и не нужны — права те же.
export const getLandingStats = unstable_cache(
  async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    // Запросы не меняются (см. src/app/page.tsx): лидерборд по-прежнему
    // запрашивается, хотя на лендинге больше не выводится.
    const [{ data: statsData }, , { data: reviewsData }] = await Promise.all([
      supabase.rpc('get_public_platform_stats'),
      supabase.rpc('get_editor_leaderboard', { p_limit: 10 }),
      supabase.rpc('get_public_reviews', { p_limit: 6 }),
    ]);
    return { statsData, reviewsData };
  },
  ['landing-stats'],
  { revalidate: 300 }
);
