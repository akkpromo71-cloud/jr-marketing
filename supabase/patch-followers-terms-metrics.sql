-- Патч: подписчики эдитора (для более информативной таблицы заявок),
-- согласие с условиями использования (при регистрации и при создании
-- кампании) и расширенный отчёт по кампании для артиста (потрачено, сдано
-- эдитов) + функция средних просмотров эдитора для админки.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно (add column if not exists / create or replace).

-- =========================================================
-- 1. profiles: подписчики (само-заявленное число, как соцсети) и отметка
--    о согласии с условиями использования.
-- =========================================================
alter table public.profiles add column if not exists followers bigint;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- =========================================================
-- 2. campaigns: отдельное согласие с условиями кампании (артист подтверждает
--    права на трек и то, что охват — оценка, а не гарантия) — фиксируется
--    заново при каждой публикации трека, независимо от согласия при регистрации.
-- =========================================================
alter table public.campaigns add column if not exists terms_accepted_at timestamptz;

-- =========================================================
-- 3. Триггер автосоздания профиля — добавляем followers/terms_accepted_at
--    в маппинг из user_metadata (полная копия существующей функции +
--    новые поля, иначе значения из формы регистрации будут молча теряться).
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, role, display_name, bio, editor_status,
    price_min, price_max, telegram, instagram, tiktok, portfolio_url,
    paypal_email, crypto_wallet, followers, terms_accepted_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'artist'),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'bio', ''),
    case when coalesce(new.raw_user_meta_data->>'role', 'artist') = 'editor' then 'pending' else null end,
    nullif(new.raw_user_meta_data->>'price_min', '')::numeric,
    nullif(new.raw_user_meta_data->>'price_max', '')::numeric,
    nullif(new.raw_user_meta_data->>'telegram', ''),
    nullif(new.raw_user_meta_data->>'instagram', ''),
    nullif(new.raw_user_meta_data->>'tiktok', ''),
    nullif(new.raw_user_meta_data->>'portfolio_url', ''),
    nullif(new.raw_user_meta_data->>'paypal_email', ''),
    nullif(new.raw_user_meta_data->>'crypto_wallet', ''),
    nullif(new.raw_user_meta_data->>'followers', '')::bigint,
    nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 4. Отчёт для артиста (get_campaign_report) — добавляем total_spent (сумма
--    цены по заявкам в работе/сданным/завершённым — то же определение, что
--    и "Занято эдиторами" в админке) и edits_count (сколько эдиторов уже
--    прислали ссылку на готовый эдит, независимо от того, принят ли он
--    администратором как completed).
-- =========================================================
create or replace function public.get_campaign_report(p_campaign_id uuid)
returns table (
  applications_count bigint,
  accepted_count bigint,
  completed_count bigint,
  total_views bigint,
  total_likes bigint,
  total_spent numeric,
  edits_count bigint
) as $$
  select
    count(*) as applications_count,
    count(*) filter (where status in ('accepted','in_revision','delivered','completed')) as accepted_count,
    count(*) filter (where status = 'completed') as completed_count,
    coalesce(sum(views_count), 0) as total_views,
    coalesce(sum(likes_count), 0) as total_likes,
    coalesce(sum(price) filter (where status in ('accepted','in_revision','delivered','completed')), 0) as total_spent,
    count(*) filter (where posted_url is not null or views_count is not null) as edits_count
  from public.applications
  where campaign_id = p_campaign_id
    and (public.is_admin() or public.is_campaign_owner(p_campaign_id));
$$ language sql stable security definer set search_path = public;

-- =========================================================
-- 5. Средние просмотры эдитора — для более информативной таблицы заявок
--    в админке (рядом с ценой и соцсетями видно реальную статистику по
--    прошлым эдитам). Считает только по эдитам, где уже есть просмотры,
--    и только для администратора — как и get_campaign_report, для всех
--    остальных вызывающих просто вернёт пусто (не ошибку).
-- =========================================================
create or replace function public.get_editor_avg_views(p_editor_ids uuid[])
returns table (
  editor_id uuid,
  avg_views numeric,
  completed_count bigint
) as $$
  select
    a.editor_id,
    avg(a.views_count)::numeric as avg_views,
    count(*) filter (where a.status = 'completed') as completed_count
  from public.applications a
  where a.editor_id = any(p_editor_ids)
    and a.views_count is not null
    and public.is_admin()
  group by a.editor_id;
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_editor_avg_views(uuid[]) to authenticated;

