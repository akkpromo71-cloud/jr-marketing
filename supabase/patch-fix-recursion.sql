-- ГЛАВНЫЙ ФИКС: разрываем циклическую зависимость между политиками campaigns и
-- applications, из-за которой Postgres падал с ошибкой
-- "infinite recursion detected in policy for relation campaigns" —
-- а сайт эту ошибку тихо проглатывал и показывал "кампаний нет".
--
-- Ничего не удаляет из данных. Безопасно выполнять повторно.
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.

-- 1) Вспомогательные функции — они проверяют то же самое (откликался ли эдитор
--    на кампанию / является ли артист владельцем кампании), но делают это в
--    обход RLS второй таблицы (security definer), поэтому не запускают чужую
--    политику заново и не создают цикл.
create or replace function public.editor_applied_to_campaign(p_campaign_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.applications a
    where a.campaign_id = p_campaign_id and a.editor_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_campaign_owner(p_campaign_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id and c.artist_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

-- 2) Пересоздаём политики campaigns_select / applications_select / applications_update
--    так, чтобы они использовали функции выше вместо прямого обращения к другой таблице.
drop policy if exists "campaigns_select" on public.campaigns;
create policy "campaigns_select" on public.campaigns
  for select using (
    status = 'open' or artist_id = auth.uid() or public.is_admin()
    or public.editor_applied_to_campaign(id)
  );

drop policy if exists "applications_select" on public.applications;
create policy "applications_select" on public.applications
  for select using (
    editor_id = auth.uid()
    or public.is_admin()
    or public.is_campaign_owner(campaign_id)
  );

drop policy if exists "applications_update" on public.applications;
create policy "applications_update" on public.applications
  for update using (
    editor_id = auth.uid()
    or public.is_admin()
    or public.is_campaign_owner(campaign_id)
  );

-- 3) Проверка: то же самое, что уже пробовали в диагностике №2 — притворяемся
--    анонимным посетителем. Теперь строка должна появиться (title/status видны).
set local role anon;
select id, title, status, artist_id from public.campaigns;
reset role;
