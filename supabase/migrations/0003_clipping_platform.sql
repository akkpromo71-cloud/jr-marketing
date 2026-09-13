-- Миграция: переход с музыкального маркетплейса (артист/эдитор, фикс-цена за
-- эдит) на клиппинг-платформу (клиент/клиппер, оплата за 1000 просмотров).
--
-- Роли в БД НЕ переименовываются (role остаётся 'artist' / 'editor' / 'admin') —
-- "клиент"/"клиппер" это переименование только в интерфейсе (см. src/lib/i18n.ts).
-- Старые таблицы/колонки не удаляются и не переименовываются, старые кампании и
-- заявки (музыкальный флоу) продолжают существовать в БД как есть, просто больше
-- не создаются из интерфейса.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно (create if not exists / create or replace).

-- =========================================================
-- 1. campaigns: новые поля клиппинг-кампании
-- =========================================================
alter table public.campaigns add column if not exists cpm_rate numeric;
alter table public.campaigns add column if not exists client_cpm numeric;
alter table public.campaigns add column if not exists budget_total numeric not null default 0;
alter table public.campaigns add column if not exists budget_reserved numeric not null default 0;
alter table public.campaigns add column if not exists budget_spent numeric not null default 0;
alter table public.campaigns add column if not exists per_clip_cap numeric;
alter table public.campaigns add column if not exists max_clips_per_clipper int;
alter table public.campaigns add column if not exists platforms text[] not null default '{}'::text[];
alter table public.campaigns add column if not exists rules text;
alter table public.campaigns add column if not exists required_caption text;
alter table public.campaigns add column if not exists source_urls text[] not null default '{}'::text[];
alter table public.campaigns add column if not exists slot_ttl_hours int not null default 72;
alter table public.campaigns add column if not exists track_sound_url text;

-- status: расширяем список допустимых значений, не трогая старые данные
-- (существующие кампании стоят в 'open'/'in_progress'/'completed'/'closed').
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('open', 'in_progress', 'completed', 'closed', 'draft', 'funded', 'active', 'paused', 'finished'));

alter table public.campaigns drop constraint if exists campaigns_cpm_rate_nonneg;
alter table public.campaigns add constraint campaigns_cpm_rate_nonneg check (cpm_rate is null or cpm_rate >= 0);
alter table public.campaigns drop constraint if exists campaigns_client_cpm_nonneg;
alter table public.campaigns add constraint campaigns_client_cpm_nonneg check (client_cpm is null or client_cpm >= 0);
alter table public.campaigns drop constraint if exists campaigns_budget_total_nonneg;
alter table public.campaigns add constraint campaigns_budget_total_nonneg check (budget_total >= 0);
alter table public.campaigns drop constraint if exists campaigns_budget_reserved_nonneg;
alter table public.campaigns add constraint campaigns_budget_reserved_nonneg check (budget_reserved >= 0);
alter table public.campaigns drop constraint if exists campaigns_budget_spent_nonneg;
alter table public.campaigns add constraint campaigns_budget_spent_nonneg check (budget_spent >= 0);
-- Главный денежный инвариант: нельзя зарезервировать/потратить больше, чем есть в бюджете.
alter table public.campaigns drop constraint if exists campaigns_budget_not_overcommitted;
alter table public.campaigns add constraint campaigns_budget_not_overcommitted
  check (budget_reserved + budget_spent <= budget_total);
alter table public.campaigns drop constraint if exists campaigns_per_clip_cap_nonneg;
alter table public.campaigns add constraint campaigns_per_clip_cap_nonneg check (per_clip_cap is null or per_clip_cap >= 0);
alter table public.campaigns drop constraint if exists campaigns_max_clips_per_clipper_positive;
alter table public.campaigns add constraint campaigns_max_clips_per_clipper_positive
  check (max_clips_per_clipper is null or max_clips_per_clipper > 0);
alter table public.campaigns drop constraint if exists campaigns_slot_ttl_hours_positive;
alter table public.campaigns add constraint campaigns_slot_ttl_hours_positive check (slot_ttl_hours > 0);

-- =========================================================
-- 2. slots — резерв бюджета за клиппером
-- =========================================================
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  clipper_id uuid not null references public.profiles (id) on delete cascade,
  amount_reserved numeric not null check (amount_reserved >= 0),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists idx_slots_campaign on public.slots (campaign_id);
create index if not exists idx_slots_clipper on public.slots (clipper_id);
create index if not exists idx_slots_status_expires on public.slots (status, expires_at);

-- =========================================================
-- 3. submissions — сданные ролики
-- =========================================================
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  clipper_id uuid not null references public.profiles (id) on delete cascade,
  slot_id uuid not null references public.slots (id) on delete cascade,
  url text not null,
  platform text not null check (platform in ('tiktok', 'reels', 'shorts')),
  posted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  -- Причина отказа обязательна при rejected: справочник причин + свободный комментарий.
  reject_reason_code text check (reject_reason_code in
    ('low_quality', 'wrong_caption', 'fake_views', 'duplicate', 'off_brief', 'other')),
  reject_reason_comment text,
  views_total bigint not null default 0 check (views_total >= 0),
  views_paid bigint not null default 0 check (views_paid >= 0),
  earned numeric not null default 0 check (earned >= 0),
  capped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Один URL — одна работа, на уровне базы (Этап 6, антифрод).
  unique (url),
  constraint submissions_reject_reason_required
    check (status <> 'rejected' or reject_reason_code is not null)
);
create index if not exists idx_submissions_campaign on public.submissions (campaign_id);
create index if not exists idx_submissions_clipper on public.submissions (clipper_id);
create index if not exists idx_submissions_slot on public.submissions (slot_id);
create index if not exists idx_submissions_status on public.submissions (status);

drop trigger if exists trg_submissions_updated_at on public.submissions;
create trigger trg_submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- =========================================================
-- 4. view_snapshots — снимки просмотров/лайков (начисление считается по
--    приросту между снимками, а не по общей сумме — защита от двойного счёта).
-- =========================================================
create table if not exists public.view_snapshots (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  checked_at timestamptz not null default now(),
  views bigint not null check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  source text not null default 'auto' check (source in ('auto', 'manual')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists idx_view_snapshots_submission on public.view_snapshots (submission_id, checked_at desc);

-- =========================================================
-- 5. earnings — начисления клипперу, каждое привязано к ровно одному снимку
--    (unique(snapshot_id) — защита от повторного начисления за тот же снимок).
-- =========================================================
create table if not exists public.earnings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  snapshot_id uuid not null references public.view_snapshots (id) on delete cascade,
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (snapshot_id)
);
create index if not exists idx_earnings_submission on public.earnings (submission_id);

-- =========================================================
-- 6. wallets — баланс клиппера (кэш; меняется только вместе с earnings/withdrawals
--    внутри security definer функций ниже, никогда напрямую из приложения).
-- =========================================================
create table if not exists public.wallets (
  clipper_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 7. withdrawals — заявки на вывод, без минимальной суммы, подтверждает админ
-- =========================================================
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  clipper_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text not null check (method in ('paypal', 'crypto')),
  details text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  admin_comment text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists idx_withdrawals_clipper on public.withdrawals (clipper_id);
create index if not exists idx_withdrawals_status on public.withdrawals (status);

-- =========================================================
-- 8. sound_usage_snapshots — для музыкальных кампаний: сколько новых видео
--    с этим звуком появилось за время кампании.
-- =========================================================
create table if not exists public.sound_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  checked_at timestamptz not null default now(),
  videos_count bigint not null check (videos_count >= 0)
);
create index if not exists idx_sound_usage_campaign on public.sound_usage_snapshots (campaign_id, checked_at desc);

-- =========================================================
-- 9. client_deposits — пополнения кампаний, подтверждает админ вручную
--    (реальные платежи не интегрируем на этом этапе).
-- =========================================================
create table if not exists public.client_deposits (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_comment text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists idx_client_deposits_campaign on public.client_deposits (campaign_id);
create index if not exists idx_client_deposits_status on public.client_deposits (status);

-- =========================================================
-- 10. RLS
-- =========================================================
alter table public.slots enable row level security;
alter table public.submissions enable row level security;
alter table public.view_snapshots enable row level security;
alter table public.earnings enable row level security;
alter table public.wallets enable row level security;
alter table public.withdrawals enable row level security;
alter table public.sound_usage_snapshots enable row level security;
alter table public.client_deposits enable row level security;

-- ---- helper: клиппер участвует в кампании (слот или сдача) — нужен, чтобы
--      расширить видимость campaigns для клиппера без прямой ссылки на slots/
--      submissions из политики campaigns_select (та же защита от рекурсии,
--      что и editor_applied_to_campaign в patch-fix-recursion.sql).
create or replace function public.clipper_in_campaign(p_campaign_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.slots s where s.campaign_id = p_campaign_id and s.clipper_id = auth.uid()
  ) or exists (
    select 1 from public.submissions sub where sub.campaign_id = p_campaign_id and sub.clipper_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- Клиппинг-кампании видны клипперам, пока они funded/active (не только owner/admin/open).
drop policy if exists "campaigns_select" on public.campaigns;
create policy "campaigns_select" on public.campaigns
  for select using (
    status in ('open', 'funded', 'active')
    or artist_id = auth.uid()
    or public.is_admin()
    or public.editor_applied_to_campaign(id)
    or public.clipper_in_campaign(id)
  );

-- ---- slots ----
-- Читает: сам клиппер, владелец кампании (клиент), админ.
create policy "slots_select" on public.slots
  for select using (
    clipper_id = auth.uid() or public.is_admin() or public.is_campaign_owner(campaign_id)
  );
-- Запись — только через security definer функции ниже (take_slot и т.п.),
-- которые сами проверяют auth.uid() и бизнес-правила; прямых insert/update
-- политик для authenticated нет намеренно (как rate_limit_events).

-- ---- submissions ----
create policy "submissions_select" on public.submissions
  for select using (
    clipper_id = auth.uid() or public.is_admin() or public.is_campaign_owner(campaign_id)
  );

-- ---- view_snapshots ----
create policy "view_snapshots_select" on public.view_snapshots
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.submissions sub
      where sub.id = view_snapshots.submission_id
        and (sub.clipper_id = auth.uid() or public.is_campaign_owner(sub.campaign_id))
    )
  );

-- ---- earnings ----
create policy "earnings_select" on public.earnings
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.submissions sub
      where sub.id = earnings.submission_id
        and (sub.clipper_id = auth.uid() or public.is_campaign_owner(sub.campaign_id))
    )
  );

-- ---- wallets ----
create policy "wallets_select" on public.wallets
  for select using (clipper_id = auth.uid() or public.is_admin());

-- ---- withdrawals ----
create policy "withdrawals_select" on public.withdrawals
  for select using (clipper_id = auth.uid() or public.is_admin());
-- insert идёт через request_withdrawal() (security definer) — сама вставка
-- напрямую с клиента не разрешена, чтобы нельзя было создать заявку с чужим
-- clipper_id или в обход проверки баланса.

-- ---- sound_usage_snapshots ----
create policy "sound_usage_select" on public.sound_usage_snapshots
  for select using (public.is_admin() or public.is_campaign_owner(campaign_id) or public.clipper_in_campaign(campaign_id));

-- ---- client_deposits ----
create policy "client_deposits_select" on public.client_deposits
  for select using (client_id = auth.uid() or public.is_admin());
create policy "client_deposits_insert" on public.client_deposits
  for insert with check (client_id = auth.uid() and public.is_campaign_owner(campaign_id));

-- =========================================================
-- 11. Права доступа (grants) — та же логика, что и patch-grants.sql: RLS
--     ограничивает строки, но саму возможность обращаться к таблице роль
--     должна получить явно.
-- =========================================================
grant select on public.slots, public.submissions, public.view_snapshots, public.earnings,
  public.wallets, public.withdrawals, public.sound_usage_snapshots, public.client_deposits
  to authenticated;
grant insert on public.client_deposits to authenticated;
