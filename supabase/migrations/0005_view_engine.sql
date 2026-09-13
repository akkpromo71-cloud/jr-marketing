-- Миграция: движок подсчёта просмотров — сердце площадки (Этап 2).
--
-- Начисление считается СТРОГО по приросту между снимками (view_snapshots),
-- никогда по общей сумме — защита от двойного начисления, если крон
-- запустится дважды или снимок будет перезаписан. Один снимок — максимум
-- одно начисление (unique(snapshot_id) в earnings, см. 0003).
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл
-- ПОСЛЕ 0003 и 0004 -> Run. Безопасно выполнять повторно.

-- =========================================================
-- 1. submissions: пометка подозрительного прироста просмотров (Этап 6,
--    антифрод) — держим начисление на паузе до ручной проверки админом.
-- =========================================================
alter table public.submissions add column if not exists flagged boolean not null default false;
alter table public.submissions add column if not exists flagged_reason text;

-- =========================================================
-- 2. record_view_snapshot — записывает снимок и, если это не аномалия и
--    работа не на паузе антифрода, тут же начисляет клипперу.
--
--    Вызывается ИЗ ОДНОГО МЕСТА двумя путями: кроном (service_role, source =
--    'auto') и админом вручную (source = 'manual', обязательный фолбэк —
--    ввод просмотров руками, когда автосбор не сработал). Оба пути идут
--    через одну и ту же функцию, поэтому расчёт прироста/потолка/бюджета
--    гарантированно одинаковый и не может разъехаться.
-- =========================================================
create or replace function public.record_view_snapshot(
  p_submission_id uuid,
  p_views bigint,
  p_likes bigint default 0,
  p_source text default 'auto'
)
returns uuid as $$
declare
  v_admin uuid := auth.uid();
  v_submission record;
  v_slot record;
  v_campaign record;
  v_prev_views bigint;
  v_increment bigint;
  v_remaining_cap numeric;
  v_amount numeric := 0;
  v_paid_views bigint := 0;
  v_is_anomaly boolean := false;
  v_snapshot_id uuid;
begin
  if p_source = 'manual' then
    if not public.is_admin() then
      raise exception 'admin only for manual snapshots';
    end if;
  elsif auth.role() <> 'service_role' then
    raise exception 'auto snapshots are cron-only';
  end if;

  if p_views < 0 then
    raise exception 'views cannot be negative';
  end if;

  select id, campaign_id, slot_id, status, earned, views_total, flagged
    into v_submission
    from public.submissions where id = p_submission_id for update;
  if not found then
    raise exception 'submission not found';
  end if;
  -- Только принятые и живые работы монетизируются — на pending/rejected/removed
  -- снимок можно записать (история), но без начисления.
  if v_submission.status <> 'approved' then
    insert into public.view_snapshots (submission_id, views, likes, source, created_by)
    values (p_submission_id, p_views, p_likes, p_source, case when p_source = 'manual' then v_admin end)
    returning id into v_snapshot_id;
    return v_snapshot_id;
  end if;

  select amount_reserved, campaign_id into v_slot from public.slots where id = v_submission.slot_id for update;
  select cpm_rate into v_campaign from public.campaigns where id = v_submission.campaign_id;

  select views into v_prev_views
    from public.view_snapshots
    where submission_id = p_submission_id
    order by checked_at desc
    limit 1;
  v_prev_views := coalesce(v_prev_views, 0);
  v_increment := greatest(p_views - v_prev_views, 0);

  -- Антифрод: аномальный скачок относительно предыдущего снимка — ставим на
  -- удержание вместо автосписания (Этап 6). Порог: рост больше чем в 5 раз
  -- при базе от 100 просмотров — маленькие ролики и так шумят на порядки.
  if not v_submission.flagged and v_prev_views >= 100 and p_views > v_prev_views * 5 then
    v_is_anomaly := true;
  end if;

  insert into public.view_snapshots (submission_id, views, likes, source, created_by)
  values (p_submission_id, p_views, p_likes, p_source, case when p_source = 'manual' then v_admin end)
  returning id into v_snapshot_id;

  if v_is_anomaly then
    update public.submissions
      set flagged = true,
          flagged_reason = format('view spike: %s -> %s between snapshots', v_prev_views, p_views),
          views_total = p_views
      where id = p_submission_id;
    return v_snapshot_id;
  end if;

  if v_submission.flagged then
    -- Уже на удержании с прошлого раза — снимок пишем, но не начисляем,
    -- пока админ не разберёт (см. admin_resolve_flag).
    update public.submissions set views_total = p_views where id = p_submission_id;
    return v_snapshot_id;
  end if;

  if v_campaign.cpm_rate is not null and v_campaign.cpm_rate > 0 and v_increment > 0 then
    v_remaining_cap := greatest(v_slot.amount_reserved - v_submission.earned, 0);
    v_amount := least(v_increment / 1000.0 * v_campaign.cpm_rate, v_remaining_cap);
    if v_amount > 0 then
      v_paid_views := floor(v_amount / (v_campaign.cpm_rate / 1000.0));
    end if;
  end if;

  update public.submissions
    set views_total = p_views,
        views_paid = views_paid + v_paid_views,
        earned = earned + v_amount,
        capped = (earned + v_amount >= v_slot.amount_reserved),
        updated_at = now()
    where id = p_submission_id;

  if v_amount > 0 then
    insert into public.earnings (submission_id, snapshot_id, amount) values (p_submission_id, v_snapshot_id, v_amount);

    update public.campaigns
      set budget_reserved = budget_reserved - v_amount,
          budget_spent = budget_spent + v_amount
      where id = v_submission.campaign_id;

    insert into public.wallets (clipper_id, balance)
      select clipper_id, 0 from public.submissions where id = p_submission_id
      on conflict (clipper_id) do nothing;
    update public.wallets w set balance = balance + v_amount, updated_at = now()
      from public.submissions sub
      where sub.id = p_submission_id and w.clipper_id = sub.clipper_id;
  end if;

  return v_snapshot_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.record_view_snapshot(uuid, bigint, bigint, text) to authenticated;

-- =========================================================
-- 3. admin_resolve_flag — разбор аномалии: подтвердить (досчитать
--    накопленные с момента удержания просмотры и начислить) или отклонить
--    (снять пометку без оплаты придержанного прироста).
-- =========================================================
create or replace function public.admin_resolve_flag(p_submission_id uuid, p_credit boolean)
returns void as $$
declare
  v_submission record;
  v_slot record;
  v_campaign record;
  v_last_snapshot uuid;
  v_pending_views bigint;
  v_remaining_cap numeric;
  v_amount numeric := 0;
  v_paid_views bigint := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select id, campaign_id, slot_id, earned, views_total, views_paid, flagged
    into v_submission
    from public.submissions where id = p_submission_id for update;
  if not found or not v_submission.flagged then
    raise exception 'submission is not flagged';
  end if;

  if p_credit then
    select amount_reserved into v_slot from public.slots where id = v_submission.slot_id for update;
    select cpm_rate into v_campaign from public.campaigns where id = v_submission.campaign_id;

    select id into v_last_snapshot
      from public.view_snapshots
      where submission_id = p_submission_id
      order by checked_at desc
      limit 1;

    v_pending_views := greatest(v_submission.views_total - v_submission.views_paid, 0);
    if v_campaign.cpm_rate is not null and v_campaign.cpm_rate > 0 and v_pending_views > 0 and v_last_snapshot is not null then
      v_remaining_cap := greatest(v_slot.amount_reserved - v_submission.earned, 0);
      v_amount := least(v_pending_views / 1000.0 * v_campaign.cpm_rate, v_remaining_cap);
      if v_amount > 0 then
        v_paid_views := floor(v_amount / (v_campaign.cpm_rate / 1000.0));
        insert into public.earnings (submission_id, snapshot_id, amount)
          values (p_submission_id, v_last_snapshot, v_amount)
          on conflict (snapshot_id) do nothing;

        update public.campaigns
          set budget_reserved = budget_reserved - v_amount, budget_spent = budget_spent + v_amount
          where id = v_submission.campaign_id;

        insert into public.wallets (clipper_id, balance)
          select clipper_id, 0 from public.submissions where id = p_submission_id
          on conflict (clipper_id) do nothing;
        update public.wallets w set balance = balance + v_amount, updated_at = now()
          from public.submissions sub
          where sub.id = p_submission_id and w.clipper_id = sub.clipper_id;
      end if;
    end if;

    update public.submissions
      set views_paid = views_paid + v_paid_views, earned = earned + v_amount,
          capped = (earned + v_amount >= v_slot.amount_reserved), flagged = false
      where id = p_submission_id;
  else
    update public.submissions set flagged = false where id = p_submission_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.admin_resolve_flag(uuid, boolean) to authenticated;

-- =========================================================
-- 4. mark_submission_removed — пост пропал (крон живости): начисления
--    останавливаются, неизрасходованный резерв слота возвращается в бюджет.
-- =========================================================
create or replace function public.mark_submission_removed(p_submission_id uuid)
returns void as $$
declare
  v_submission record;
  v_slot record;
  v_remaining numeric;
begin
  if auth.role() is not null and auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'not allowed';
  end if;

  select id, slot_id, status, earned into v_submission
    from public.submissions where id = p_submission_id for update;
  if not found or v_submission.status <> 'approved' then
    return;
  end if;

  select id, campaign_id, amount_reserved into v_slot from public.slots where id = v_submission.slot_id for update;
  v_remaining := greatest(v_slot.amount_reserved - v_submission.earned, 0);

  update public.submissions set status = 'removed' where id = p_submission_id;

  if v_remaining > 0 then
    update public.campaigns set budget_reserved = budget_reserved - v_remaining where id = v_slot.campaign_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.mark_submission_removed(uuid) to authenticated;
