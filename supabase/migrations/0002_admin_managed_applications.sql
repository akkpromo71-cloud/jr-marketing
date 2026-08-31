-- Патч 0002: подбор эдиторов и статус заявки теперь ведёт только администратор.
--
-- Артист даёт бюджет и бриф на кампанию — дальше подбором эдиторов и приёмкой
-- работы занимается команда J/R marketing (роль admin). Артист больше не
-- видит и не может менять отдельные заявки: только агрегированный отчёт по
-- своей кампании (через функцию get_campaign_report ниже).
--
-- Выполните этот файл целиком в Supabase Dashboard -> SQL Editor
-- (ПОСЛЕ того, как уже выполнен supabase/schema.sql).

-- =========================================================
-- 1. Триггер: артист больше не может двигать статус заявки —
--    только админ (в любую сторону) и сам эдитор (только в 'delivered').
-- =========================================================
create or replace function public.check_application_transition()
returns trigger as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() = old.editor_id then
    if new.status is distinct from old.status
       and not (old.status in ('accepted', 'in_revision') and new.status = 'delivered') then
      raise exception 'editor is not allowed to set application status to %', new.status;
    end if;
  else
    raise exception 'not allowed to update this application';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- =========================================================
-- 2. RLS: артист больше не читает и не обновляет чужие заявки напрямую —
--    видеть и менять отклики может сам эдитор или администратор.
-- =========================================================
drop policy if exists "applications_select" on public.applications;
create policy "applications_select" on public.applications
  for select using (
    editor_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "applications_update" on public.applications;
create policy "applications_update" on public.applications
  for update using (
    editor_id = auth.uid()
    or public.is_admin()
  );

-- =========================================================
-- 3. RLS: чат по правкам — теперь только эдитор заявки и администратор.
-- =========================================================
drop policy if exists "revision_messages_select" on public.revision_messages;
create policy "revision_messages_select" on public.revision_messages
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = revision_messages.application_id
        and (a.editor_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "revision_messages_insert" on public.revision_messages;
create policy "revision_messages_insert" on public.revision_messages
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.applications a
      where a.id = revision_messages.application_id
        and (a.editor_id = auth.uid() or public.is_admin())
    )
  );

-- =========================================================
-- 4. Агрегированный отчёт для артиста: сумма просмотров/лайков и счётчики
--    по статусам — БЕЗ доступа к самим строкам заявок (кто из эдиторов,
--    по какой цене и т.д.). Работает через security definer, поэтому
--    отдельная RLS-политика на applications для артиста не нужна: если
--    вызывающий не владелец кампании и не админ, условие в where даёт 0
--    строк и все агрегаты возвращаются нулями (coalesce), а не ошибкой.
-- =========================================================
create or replace function public.get_campaign_report(p_campaign_id uuid)
returns table (
  applications_count bigint,
  accepted_count bigint,
  completed_count bigint,
  total_views bigint,
  total_likes bigint
) as $$
  select
    count(*) as applications_count,
    count(*) filter (where status in ('accepted','in_revision','delivered','completed')) as accepted_count,
    count(*) filter (where status = 'completed') as completed_count,
    coalesce(sum(views_count), 0) as total_views,
    coalesce(sum(likes_count), 0) as total_likes
  from public.applications
  where campaign_id = p_campaign_id
    and (public.is_admin() or public.is_campaign_owner(p_campaign_id));
$$ language sql stable security definer set search_path = public;
