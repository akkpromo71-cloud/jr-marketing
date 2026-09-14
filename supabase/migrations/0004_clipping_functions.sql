-- Миграция: бизнес-логика клиппинг-платформы — взятие слота (резерв бюджета),
-- сдача работы, модерация, вывод средств, пополнение кампании. Всё через
-- security definer функции с явными row-level блокировками (select ... for
-- update), чтобы резерв бюджета и баланс кошелька были верны при параллельных
-- запросах (два клиппера одновременно берут последний слот и т.п.).
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл ПОСЛЕ
-- 0003_clipping_platform.sql -> Run. Безопасно выполнять повторно.

-- =========================================================
-- 1. Защита денежных колонок campaigns от прямого изменения владельцем.
--    Резерв/трата бюджета должны идти только через функции ниже (take_slot,
--    expire_slots, record_view_snapshot, admin_confirm_deposit), не через
--    обычный UPDATE campaigns из формы редактирования кампании.
--
--    Условие "auth.uid() = old.artist_id" — намеренно узкое: эти же колонки
--    трогают take_slot/submit_clip (вызывает клиппер, не владелец кампании) и
--    крон (service_role) через SECURITY DEFINER, который обходит RLS, но НЕ
--    обходит триггеры — поэтому триггер должен пропускать их без изменений,
--    а блокировать только самого владельца кампании, обновляющего свою строку
--    напрямую (единственный, для кого это в принципе достижимо через RLS).
-- =========================================================
create or replace function public.protect_campaign_budget_columns()
returns trigger as $$
begin
  if auth.role() is null or auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if auth.uid() = old.artist_id then
    new.budget_total := old.budget_total;
    new.budget_reserved := old.budget_reserved;
    new.budget_spent := old.budget_spent;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_protect_campaign_budget_columns on public.campaigns;
create trigger trg_protect_campaign_budget_columns
  before update on public.campaigns
  for each row execute function public.protect_campaign_budget_columns();

-- =========================================================
-- 2. take_slot — резервирует per_clip_cap из бюджета кампании за клиппером.
--    Реальный резерв суммы (различие №1 площадки): деньги придерживаются
--    сразу, а не в момент, когда работа уже готова.
-- =========================================================
create or replace function public.take_slot(p_campaign_id uuid)
returns uuid as $$
declare
  v_clipper uuid := auth.uid();
  v_campaign record;
  v_amount numeric;
  v_active_clips int;
  v_slot_id uuid;
begin
  if v_clipper is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_clipper and role = 'editor' and editor_status = 'approved'
  ) then
    raise exception 'clipper account is not approved yet';
  end if;

  select id, status, budget_total, budget_reserved, budget_spent, per_clip_cap,
         max_clips_per_clipper, slot_ttl_hours
    into v_campaign
    from public.campaigns
    where id = p_campaign_id
    for update;

  if not found then
    raise exception 'campaign not found';
  end if;
  if v_campaign.status not in ('funded', 'active') then
    raise exception 'campaign is not open for slots';
  end if;
  if v_campaign.per_clip_cap is null or v_campaign.per_clip_cap <= 0 then
    raise exception 'campaign has no per-clip cap configured';
  end if;

  if v_campaign.max_clips_per_clipper is not null then
    select count(*) into v_active_clips
    from public.slots
    where campaign_id = p_campaign_id and clipper_id = v_clipper and status in ('active', 'used');
    if v_active_clips >= v_campaign.max_clips_per_clipper then
      raise exception 'clip limit per clipper reached for this campaign';
    end if;
  end if;

  v_amount := v_campaign.per_clip_cap;
  if v_campaign.budget_total - v_campaign.budget_reserved - v_campaign.budget_spent < v_amount then
    raise exception 'insufficient campaign budget for a new slot';
  end if;

  insert into public.slots (campaign_id, clipper_id, amount_reserved, expires_at, status)
  values (p_campaign_id, v_clipper, v_amount, now() + (v_campaign.slot_ttl_hours || ' hours')::interval, 'active')
  returning id into v_slot_id;

  update public.campaigns
    set budget_reserved = budget_reserved + v_amount
    where id = p_campaign_id;

  return v_slot_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.take_slot(uuid) to authenticated;

-- =========================================================
-- 3. submit_clip — сдача ролика по ранее взятому слоту.
-- =========================================================
create or replace function public.submit_clip(p_slot_id uuid, p_url text, p_platform text)
returns uuid as $$
declare
  v_clipper uuid := auth.uid();
  v_slot record;
  v_campaign record;
  v_submission_id uuid;
begin
  if v_clipper is null then
    raise exception 'not authenticated';
  end if;
  if p_url is null or length(trim(p_url)) = 0 then
    raise exception 'url is required';
  end if;

  select id, campaign_id, clipper_id, amount_reserved, status, expires_at
    into v_slot
    from public.slots
    where id = p_slot_id
    for update;

  if not found or v_slot.clipper_id <> v_clipper then
    raise exception 'slot not found';
  end if;
  if v_slot.status <> 'active' then
    raise exception 'slot is not active';
  end if;
  if v_slot.expires_at < now() then
    raise exception 'slot has expired';
  end if;

  select platforms, required_caption into v_campaign
    from public.campaigns where id = v_slot.campaign_id;

  if v_campaign.platforms is not null and array_length(v_campaign.platforms, 1) > 0
     and not (p_platform = any(v_campaign.platforms)) then
    raise exception 'platform is not allowed for this campaign';
  end if;

  if exists (select 1 from public.submissions where url = p_url) then
    raise exception 'this url was already submitted';
  end if;

  insert into public.submissions (campaign_id, clipper_id, slot_id, url, platform, posted_at, status)
  values (v_slot.campaign_id, v_clipper, p_slot_id, p_url, p_platform, now(), 'pending')
  returning id into v_submission_id;

  update public.slots set status = 'used' where id = p_slot_id;

  return v_submission_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.submit_clip(uuid, text, text) to authenticated;

-- =========================================================
-- 4. admin_moderate_submission — принять/отклонить работу. Причина отказа
--    обязательна (различие №3 площадки) — без неё функция просто упадёт с
--    ошибкой, отклонить без причины технически невозможно.
-- =========================================================
create or replace function public.admin_moderate_submission(
  p_submission_id uuid,
  p_approve boolean,
  p_reason_code text default null,
  p_reason_comment text default null
)
returns void as $$
declare
  v_submission record;
  v_slot record;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select id, slot_id, status into v_submission
    from public.submissions where id = p_submission_id for update;
  if not found then
    raise exception 'submission not found';
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'submission already moderated';
  end if;

  if p_approve then
    update public.submissions set status = 'approved' where id = p_submission_id;
  else
    if p_reason_code is null then
      raise exception 'reject reason is required';
    end if;
    update public.submissions
      set status = 'rejected', reject_reason_code = p_reason_code, reject_reason_comment = p_reason_comment
      where id = p_submission_id;

    -- Работа не принята — начислений по ней не будет, весь резерв слота
    -- возвращается в бюджет кампании.
    select id, campaign_id, amount_reserved into v_slot
      from public.slots where id = v_submission.slot_id for update;

    update public.slots set status = 'cancelled' where id = v_slot.id;
    update public.campaigns set budget_reserved = budget_reserved - v_slot.amount_reserved
      where id = v_slot.campaign_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.admin_moderate_submission(uuid, boolean, text, text) to authenticated;

-- =========================================================
-- 5. finish_campaign — клиент (или админ) закрывает кампанию: новые слоты
--    больше не берутся, все ещё не сданные слоты отменяются, их резерв
--    возвращается в бюджет ("возврат неизрасходованного").
-- =========================================================
create or replace function public.finish_campaign(p_campaign_id uuid)
returns void as $$
declare
  v_total numeric;
begin
  if not (public.is_admin() or public.is_campaign_owner(p_campaign_id)) then
    raise exception 'not allowed';
  end if;

  select coalesce(sum(amount_reserved), 0) into v_total
    from public.slots where campaign_id = p_campaign_id and status = 'active';

  update public.slots set status = 'cancelled'
    where campaign_id = p_campaign_id and status = 'active';

  update public.campaigns
    set budget_reserved = budget_reserved - v_total,
        status = 'finished'
    where id = p_campaign_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.finish_campaign(uuid) to authenticated;

-- =========================================================
-- 6. expire_slots — крон: слоты, для которых истёк дедлайн без сдачи работы,
--    помечаются expired, резерв возвращается в бюджет.
-- =========================================================
create or replace function public.expire_slots()
returns int as $$
declare
  v_count int;
begin
  if auth.role() is not null and auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'not allowed';
  end if;

  with expired as (
    update public.slots
      set status = 'expired'
      where status = 'active' and expires_at < now()
      returning id, campaign_id, amount_reserved
  ), by_campaign as (
    select campaign_id, sum(amount_reserved) as total
    from expired
    group by campaign_id
  ), released as (
    update public.campaigns c
      set budget_reserved = c.budget_reserved - b.total
      from by_campaign b
      where b.campaign_id = c.id
      returning c.id
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.expire_slots() to authenticated;

-- =========================================================
-- 7. wallets / withdrawals — вывод без минимальной суммы, подтверждает админ.
--    Сумма списывается с баланса сразу при заявке (резерв, как со слотами) —
--    иначе клиппер мог бы подать несколько заявок на вывод суммарно больше
--    своего баланса, пока админ их не разобрал. При отказе — возвращается.
-- =========================================================
create or replace function public.request_withdrawal(p_amount numeric, p_method text, p_details text)
returns uuid as $$
declare
  v_clipper uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
begin
  if v_clipper is null then
    raise exception 'not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if p_method not in ('paypal', 'crypto') then
    raise exception 'unknown payout method';
  end if;
  if p_details is null or length(trim(p_details)) = 0 then
    raise exception 'payout details are required';
  end if;

  insert into public.wallets (clipper_id, balance) values (v_clipper, 0)
    on conflict (clipper_id) do nothing;

  select balance into v_balance from public.wallets where clipper_id = v_clipper for update;
  if v_balance < p_amount then
    raise exception 'insufficient balance';
  end if;

  update public.wallets set balance = balance - p_amount, updated_at = now() where clipper_id = v_clipper;

  insert into public.withdrawals (clipper_id, amount, method, details, status)
  values (v_clipper, p_amount, p_method, p_details, 'pending')
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

create or replace function public.admin_decide_withdrawal(p_withdrawal_id uuid, p_approve boolean, p_comment text default null)
returns void as $$
declare
  v_w record;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select id, clipper_id, amount, status into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal not found';
  end if;
  if v_w.status <> 'pending' then
    raise exception 'withdrawal already decided';
  end if;

  if p_approve then
    update public.withdrawals set status = 'paid', admin_comment = p_comment, decided_at = now()
      where id = p_withdrawal_id;
  else
    update public.withdrawals set status = 'rejected', admin_comment = p_comment, decided_at = now()
      where id = p_withdrawal_id;
    update public.wallets set balance = balance + v_w.amount, updated_at = now() where clipper_id = v_w.clipper_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.admin_decide_withdrawal(uuid, boolean, text) to authenticated;

-- =========================================================
-- 8. client_deposits — пополнение подтверждает админ: увеличивает бюджет и
--    переводит черновик в 'active' (виден клипперам).
-- =========================================================
create or replace function public.admin_confirm_deposit(p_deposit_id uuid, p_approve boolean, p_comment text default null)
returns void as $$
declare
  v_dep record;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select id, campaign_id, amount, status into v_dep from public.client_deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'deposit not found';
  end if;
  if v_dep.status <> 'pending' then
    raise exception 'deposit already decided';
  end if;

  if p_approve then
    -- Пополнение уже завершённой кампании увеличило бы budget_total без
    -- всякой возможности когда-либо потратить эти деньги (take_slot требует
    -- status in ('funded','active')) — деньги "зависли" бы в БД навсегда.
    if (select status from public.campaigns where id = v_dep.campaign_id) = 'finished' then
      raise exception 'cannot fund a finished campaign';
    end if;

    update public.client_deposits set status = 'approved', admin_comment = p_comment, decided_at = now()
      where id = p_deposit_id;
    update public.campaigns
      set budget_total = budget_total + v_dep.amount,
          status = case when status = 'draft' then 'active' else status end
      where id = v_dep.campaign_id;
  else
    update public.client_deposits set status = 'rejected', admin_comment = p_comment, decided_at = now()
      where id = p_deposit_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.admin_confirm_deposit(uuid, boolean, text) to authenticated;
