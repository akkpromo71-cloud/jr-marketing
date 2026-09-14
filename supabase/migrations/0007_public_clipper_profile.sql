-- Миграция: публичный профиль клиппера (дифференциатор №6 площадки) —
-- открытая страница со статистикой клиппера, без входа в аккаунт. Клиппер
-- может скрыть только сумму заработка, остальные метрики видны всегда.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

alter table public.profiles add column if not exists hide_earnings boolean not null default false;

-- Метрики считаются по approved/removed работам (removed — пост был жив и
-- оплачивался, потом пропал; это тоже реально выполненная работа, в отличие
-- от rejected/pending). Скорость сдачи — время от взятия слота до сдачи
-- ссылки, средняя по всем сданным работам клиппера.
create or replace function public.get_clipper_public_profile(p_clipper_id uuid)
returns table (
  display_name text,
  avatar_url text,
  total_earned numeric,
  avg_views numeric,
  accept_rate numeric,
  avg_submit_hours numeric,
  completed_count bigint,
  hide_earnings boolean
) as $$
  select
    p.display_name,
    p.avatar_url,
    case when p.hide_earnings then null
      else coalesce((
        select sum(e.amount) from public.earnings e
        join public.submissions s on s.id = e.submission_id
        where s.clipper_id = p.id
      ), 0)
    end as total_earned,
    (
      select avg(s.views_total) from public.submissions s
      where s.clipper_id = p.id and s.status in ('approved', 'removed')
    ) as avg_views,
    (
      select case when count(*) filter (where s.status in ('approved', 'rejected', 'removed')) = 0 then null
        else count(*) filter (where s.status in ('approved', 'removed'))::numeric
          / count(*) filter (where s.status in ('approved', 'rejected', 'removed'))
      end
      from public.submissions s
      where s.clipper_id = p.id
    ) as accept_rate,
    (
      select avg(extract(epoch from (s.created_at - sl.created_at)) / 3600.0)
      from public.submissions s
      join public.slots sl on sl.id = s.slot_id
      where s.clipper_id = p.id
    ) as avg_submit_hours,
    (
      select count(*) from public.submissions s
      where s.clipper_id = p.id and s.status in ('approved', 'removed')
    ) as completed_count,
    p.hide_earnings
  from public.profiles p
  where p.id = p_clipper_id and p.role = 'editor';
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_clipper_public_profile(uuid) to anon, authenticated;
