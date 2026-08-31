-- Патч: отзывы после завершения работы (артист <-> эдитор), публичный лидерборд
-- эдиторов по просмотрам и публичная сводная статистика площадки для лендинга.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно (create table if not exists / create or replace).

-- =========================================================
-- 1. Таблица отзывов. Артист оставляет ОДИН отзыв на кампанию целиком (не
--    видит и не выбирает конкретного эдитора — это сохраняет модель "команда
--    подбирает эдиторов", как и на остальном сайте), эдитор — один отзыв на
--    свою заявку. Оставить можно только когда есть хотя бы одна заявка со
--    статусом 'completed'. Публикует отзыв на лендинге администратор
--    (is_published) — защита от накрутки/спама, та же модель модерации, что
--    и везде на сайте.
-- =========================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  author_role text not null check (author_role in ('artist', 'editor')),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create unique index if not exists reviews_artist_unique_idx on public.reviews (campaign_id) where author_role = 'artist';
create unique index if not exists reviews_editor_unique_idx on public.reviews (application_id) where author_role = 'editor';

drop policy if exists "reviews_insert_artist" on public.reviews;
create policy "reviews_insert_artist" on public.reviews
  for insert with check (
    author_role = 'artist'
    and application_id is null
    and exists (
      select 1 from public.campaigns c
      where c.id = reviews.campaign_id
        and c.artist_id = auth.uid()
        and exists (
          select 1 from public.applications a
          where a.campaign_id = c.id and a.status = 'completed'
        )
    )
  );

drop policy if exists "reviews_insert_editor" on public.reviews;
create policy "reviews_insert_editor" on public.reviews
  for insert with check (
    author_role = 'editor'
    and application_id is not null
    and exists (
      select 1 from public.applications a
      where a.id = reviews.application_id
        and a.campaign_id = reviews.campaign_id
        and a.status = 'completed'
        and a.editor_id = auth.uid()
    )
  );

drop policy if exists "reviews_select_admin" on public.reviews;
create policy "reviews_select_admin" on public.reviews
  for select using (public.is_admin());

drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own" on public.reviews
  for select using (
    exists (select 1 from public.campaigns c where c.id = reviews.campaign_id and c.artist_id = auth.uid())
    or exists (select 1 from public.applications a where a.id = reviews.application_id and a.editor_id = auth.uid())
  );

drop policy if exists "reviews_update_admin" on public.reviews;
create policy "reviews_update_admin" on public.reviews
  for update using (public.is_admin());

grant select, insert on public.reviews to authenticated;
grant update on public.reviews to authenticated;

-- =========================================================
-- 2. Публичные отзывы для лендинга — без привязки к личности (только роль,
--    оценка, текст и название трека), только опубликованные администратором.
-- =========================================================
create or replace function public.get_public_reviews(p_limit int default 12)
returns table (
  author_role text,
  rating smallint,
  comment text,
  campaign_title text,
  created_at timestamptz
) as $$
  select r.author_role, r.rating, r.comment, c.title, r.created_at
  from public.reviews r
  join public.campaigns c on c.id = r.campaign_id
  where r.is_published = true
  order by r.created_at desc
  limit p_limit;
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_public_reviews(int) to anon, authenticated;

-- =========================================================
-- 3. Публичный лидерборд эдиторов по суммарным просмотрам — по всем их
--    работам, независимо от кампании/артиста. Только те, у кого есть
--    реальные просмотры (никаких "пустых" мест в топе).
-- =========================================================
create or replace function public.get_editor_leaderboard(p_limit int default 10)
returns table (
  display_name text,
  total_views bigint,
  total_likes bigint,
  completed_count bigint
) as $$
  select
    p.display_name,
    coalesce(sum(a.views_count), 0) as total_views,
    coalesce(sum(a.likes_count), 0) as total_likes,
    count(*) filter (where a.status = 'completed') as completed_count
  from public.applications a
  join public.profiles p on p.id = a.editor_id
  where p.role = 'editor'
  group by p.id, p.display_name
  having coalesce(sum(a.views_count), 0) > 0
  order by total_views desc
  limit p_limit;
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_editor_leaderboard(int) to anon, authenticated;

-- =========================================================
-- 4. Публичная сводная статистика площадки (для анимированных счётчиков
--    на лендинге) — только агрегаты, без доступа к отдельным строкам.
-- =========================================================
create or replace function public.get_public_platform_stats()
returns table (
  completed_edits bigint,
  total_views bigint,
  active_editors bigint
) as $$
  select
    (select count(*) from public.applications where status = 'completed') as completed_edits,
    coalesce((select sum(views_count) from public.applications), 0) as total_views,
    (select count(*) from public.profiles where role = 'editor' and editor_status = 'approved') as active_editors;
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_public_platform_stats() to anon, authenticated;
