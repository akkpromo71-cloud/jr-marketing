-- J/R marketing — базовая схема БД для MVP (основной цикл, без реальных платежей)
-- Выполните этот файл целиком в Supabase Dashboard -> SQL Editor.

-- =========================================================
-- 1. Расширения
-- =========================================================
create extension if not exists "pgcrypto";

-- =========================================================
-- 2. Таблицы
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('artist', 'editor', 'admin')),
  display_name text not null,
  avatar_url text,
  bio text,
  -- только для эдиторов: статус модерации
  editor_status text check (editor_status in ('pending', 'approved', 'rejected')),
  -- цена согласовывается администратором (может отличаться от пожеланий эдитора при регистрации)
  price_min numeric,
  price_max numeric,
  -- максимум одновременно активных (accepted/in_revision) заявок у эдитора
  active_cap int default 3,
  telegram text,
  instagram text,
  tiktok text,
  portfolio_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  track_url text,
  budget numeric,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'closed')),
  max_editors int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  editor_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'in_revision', 'delivered', 'completed')),
  price numeric,
  cover_note text,
  submission_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, editor_id)
);

create table if not exists public.revision_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3. Индексы
-- =========================================================
create index if not exists idx_campaigns_artist on public.campaigns (artist_id);
create index if not exists idx_campaigns_status on public.campaigns (status);
create index if not exists idx_applications_campaign on public.applications (campaign_id);
create index if not exists idx_applications_editor on public.applications (editor_id);
create index if not exists idx_revision_messages_application on public.revision_messages (application_id);

-- =========================================================
-- 4. updated_at триггер для applications
-- =========================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_applications_updated_at on public.applications;
create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- =========================================================
-- 4b. Защита переходов статуса заявки (доп. к RLS)
--     RLS разрешает эдитору и артисту обновлять СВОЮ заявку, но без этого
--     триггера эдитор технически мог бы сам выставить status = 'accepted'.
--     Триггер разрешает каждой роли менять статус только в свою сторону.
-- =========================================================
create or replace function public.check_application_transition()
returns trigger as $$
declare
  is_owner_artist boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  select exists (
    select 1 from public.campaigns c
    where c.id = new.campaign_id and c.artist_id = auth.uid()
  ) into is_owner_artist;

  if auth.uid() = old.editor_id then
    -- эдитор: может менять cover_note/price только пока заявка на рассмотрении,
    -- и может двигать статус только в 'delivered' из 'accepted'/'in_revision'
    if new.status is distinct from old.status
       and not (old.status in ('accepted', 'in_revision') and new.status = 'delivered') then
      raise exception 'editor is not allowed to set application status to %', new.status;
    end if;
  elsif is_owner_artist then
    -- артист: принимает/отклоняет заявку, принимает/возвращает готовую работу
    if new.status is distinct from old.status
       and new.status not in ('accepted', 'rejected', 'in_revision', 'completed') then
      raise exception 'artist is not allowed to set application status to %', new.status;
    end if;
  else
    raise exception 'not allowed to update this application';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_application_transition on public.applications;
create trigger trg_check_application_transition
  before update on public.applications
  for each row execute function public.check_application_transition();

-- =========================================================
-- 5. Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.applications enable row level security;
alter table public.revision_messages enable row level security;

-- ---- helper: является ли текущий пользователь админом ----
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- ---- profiles ----
-- Любой авторизованный пользователь может читать профили (нужно для отображения
-- имени артиста на кампании, имени эдитора на заявке и т.д.)
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Пользователь создаёт только свой профиль (id = auth.uid()) при регистрации
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- Пользователь редактирует только свой профиль; админ — любой
create policy "profiles_update_self_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- ---- campaigns ----
-- Открытые кампании видят все авторизованные пользователи; свои кампании видит артист; всё видит админ
create policy "campaigns_select" on public.campaigns
  for select using (
    status = 'open' or artist_id = auth.uid() or public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.campaign_id = campaigns.id and a.editor_id = auth.uid()
    )
  );

create policy "campaigns_insert_own" on public.campaigns
  for insert with check (artist_id = auth.uid());

create policy "campaigns_update_own_or_admin" on public.campaigns
  for update using (artist_id = auth.uid() or public.is_admin());

-- ---- applications ----
-- Заявку видит: сам эдитор, артист-владелец кампании, админ
create policy "applications_select" on public.applications
  for select using (
    editor_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = applications.campaign_id and c.artist_id = auth.uid()
    )
  );

-- Заявку создаёт только сам эдитор от своего имени
create policy "applications_insert_own" on public.applications
  for insert with check (editor_id = auth.uid());

-- Статус/данные заявки меняет: эдитор (свою), артист-владелец кампании, админ
create policy "applications_update" on public.applications
  for update using (
    editor_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = applications.campaign_id and c.artist_id = auth.uid()
    )
  );

-- ---- revision_messages ----
-- Сообщение видит: эдитор заявки, артист-владелец кампании, админ
create policy "revision_messages_select" on public.revision_messages
  for select using (
    exists (
      select 1 from public.applications a
      join public.campaigns c on c.id = a.campaign_id
      where a.id = revision_messages.application_id
        and (a.editor_id = auth.uid() or c.artist_id = auth.uid() or public.is_admin())
    )
  );

-- Писать может тот же круг участников, и только от своего имени
create policy "revision_messages_insert" on public.revision_messages
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.applications a
      join public.campaigns c on c.id = a.campaign_id
      where a.id = revision_messages.application_id
        and (a.editor_id = auth.uid() or c.artist_id = auth.uid() or public.is_admin())
    )
  );

-- =========================================================
-- 6. Автосоздание профиля при регистрации
--    Next.js передаёт данные формы регистрации в auth.signUp({ options: { data } }),
--    они попадают в raw_user_meta_data — триггер ниже переносит их в profiles.
--    Работает как security definer, поэтому не зависит от RLS и от того,
--    есть ли уже активная сессия (актуально, если включено подтверждение email).
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, role, display_name, bio, editor_status,
    price_min, price_max, telegram, instagram, tiktok, portfolio_url
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
    nullif(new.raw_user_meta_data->>'portfolio_url', '')
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
-- 7. Чтобы назначить первого администратора, выполните вручную после
--    регистрации нужного пользователя через обычную форму артиста/эдитора:
--
--    update public.profiles set role = 'admin', editor_status = null
--    where id = '<uuid пользователя из auth.users>';
-- =========================================================
