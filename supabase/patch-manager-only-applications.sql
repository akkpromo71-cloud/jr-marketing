-- Патч: заявку эдитора на кампанию решает ТОЛЬКО администратор (менеджер).
--
-- Контекст: изначально (migrations/0002_admin_managed_applications.sql) сайт
-- уже был спроектирован так, что артист не участвует в подборе эдиторов —
-- решение "принять/отклонить отклик" принимает только администратор, у самого
-- артиста нет ни RLS-доступа на UPDATE applications (политика applications_update
-- разрешает только editor_id = auth.uid() или is_admin()), ни кнопок в
-- интерфейсе.
--
-- Но когда в supabase/patch-security-hardening.sql переписывался триггер
-- check_application_transition (чтобы запретить подделку price/views_count/
-- likes_count), в него по недосмотру вернулась ветка "elsif is_owner_artist
-- then ... allow accepted/rejected/in_revision/completed" — которой в
-- исходном дизайне 0002 не было вообще. Практического риска это не создавало
-- (RLS всё равно не даёт артисту дойти до этой строки), но это лишний,
-- вводящий в заблуждение код, который прямо противоречит правилу "решение —
-- только за менеджером". Этот патч убирает его и возвращает функцию к
-- исходному смыслу миграции 0002: admin — может всё, сам эдитор — может
-- только подтвердить сдачу работы (delivered) и не может трогать
-- price/views_count/likes_count/campaign_id/editor_id, все остальные — нет.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

create or replace function public.check_application_transition()
returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
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
-- Готово. Проверить: заявка появляется в /admin в разделе "Заявки на
-- кампании" со статусом pending и пропадает оттуда после Принять/Отклонить.
-- Артист по-прежнему не видит отдельные заявки — только сводку по кампании.
-- =========================================================
