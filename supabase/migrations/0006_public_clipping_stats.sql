-- Миграция: публичная сводная статистика клиппинг-платформы для лендинга
-- (Этап 7). get_public_platform_stats() (patch-reviews-leaderboard-stats.sql)
-- считает по СТАРОЙ таблице applications и больше не отражает реальную
-- активность площадки — использовать эти цифры на новом лендинге означало
-- бы показывать нули или устаревшие числа под новым предложением. Эта
-- функция считает по новым таблицам (submissions/profiles), не трогая старую.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

create or replace function public.get_public_clipping_stats()
returns table (
  delivered_views bigint,
  clips_count bigint,
  active_clippers bigint
) as $$
  select
    coalesce((select sum(views_total) from public.submissions where status in ('approved', 'removed')), 0) as delivered_views,
    (select count(*) from public.submissions where status in ('approved', 'removed')) as clips_count,
    (select count(*) from public.profiles where role = 'editor' and editor_status = 'approved') as active_clippers;
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_public_clipping_stats() to anon, authenticated;
