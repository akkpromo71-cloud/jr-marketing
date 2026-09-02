-- Патч: реально применяем лимит одновременных заказов у эдитора (profiles.active_cap).
--
-- Контекст: колонка active_cap (int, default 3) существует в схеме с самого
-- начала и защищена от изменения самим эдитором (см. protect_privileged_profile_columns
-- в patch-security-hardening.sql / patch-profile-insert-hardening.sql), но нигде
-- не ПРОВЕРЯЛАСЬ — администратор мог назначить эдитору сколько угодно заказов
-- одновременно, лимит существовал только "на бумаге".
--
-- Это правило теперь встроено прямо в check_application_transition() (тот же
-- триггер, что уже решает, кто и как может менять статус заявки, см.
-- patch-manager-only-applications.sql) — единственное место, через которое
-- заявка вообще может перейти в статус 'accepted' (RLS admin-only + сам
-- триггер разрешают этот переход только администратору). Проверяем только
-- сам МОМЕНТ назначения заказа (переход в 'accepted' из чего-то другого) —
-- остальные переходы (reject/delivered/completed/revision) лимит не трогают.
--
-- "Активные" заказы эдитора — accepted / in_revision / delivered: работа ещё
-- не сдана и принята администратором. completed/rejected в счёт не идут —
-- место освобождается. active_cap = null означает "без лимита" (не задан).
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

create or replace function public.check_application_transition()
returns trigger as $$
declare
  editor_cap int;
  active_jobs int;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    if new.status = 'accepted' and old.status is distinct from 'accepted' then
      select active_cap into editor_cap from public.profiles where id = new.editor_id;

      if editor_cap is not null then
        select count(*) into active_jobs
        from public.applications
        where editor_id = new.editor_id
          and status in ('accepted', 'in_revision', 'delivered')
          and id <> new.id;

        if active_jobs >= editor_cap then
          raise exception 'editor already has % active job(s), at or above their cap of %', active_jobs, editor_cap;
        end if;
      end if;
    end if;

    return new;
  end if;

  if auth.uid() = old.editor_id then
    if new.status is distinct from old.status
       and not (old.status in ('accepted', 'in_revision') and new.status = 'delivered') then
      raise exception 'editor is not allowed to set application status to %', new.status;
    end if;
    if new.price is distinct from old.price
       or new.views_count is distinct from old.views_count
       or new.likes_count is distinct from old.likes_count
       or new.campaign_id is distinct from old.campaign_id
       or new.editor_id is distinct from old.editor_id then
      raise exception 'editor is not allowed to change price, stats or ownership of this application';
    end if;
  else
    raise exception 'not allowed to update this application';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- =========================================================
-- Готово. Проверить: у тестового эдитора с active_cap=3 назначить (Принять)
-- 3 заявки подряд — на 4-й администратор должен увидеть ошибку с текстом
-- про лимит активных заказов вместо тихого зависания.
-- =========================================================

