-- Патч: закрывает лазейку той же природы, что и в patch-security-hardening.sql,
-- но с другой стороны — через INSERT, а не UPDATE.
--
-- Контекст: patch-security-hardening.sql запретил менять role/editor_status/
-- price_min/price_max через UPDATE своей же строки profiles. Но в коде сайта
-- (src/lib/current-profile.ts) есть отдельный "аварийный" путь: если у
-- залогиненного пользователя почему-то ещё нет строки в profiles, сайт сам
-- создаёт её на лету — и раньше брал role напрямую из user_metadata, без
-- проверки. RLS-политика profiles_insert_self тоже разрешает INSERT только
-- по условию "id = auth.uid()", колонку role никак не ограничивает.
--
-- Это тот же вектор атаки (self-signup с role: 'admin' в metadata через
-- консоль браузера), просто через INSERT вместо UPDATE — и он НЕ прикрыт
-- предыдущим патчем, потому что тот триггер висел только на BEFORE UPDATE.
--
-- Сейчас этот путь на практике недостижим (строка delete-политики на profiles
-- нет, так что обычный пользователь не может удалить свою запись и создать
-- её заново) — но полагаться на "недостижимо сегодня" небезопасно на
-- перспективу, поэтому закрываем и на уровне базы данных, а не только в коде
-- сайта (код тоже поправлен отдельным коммитом).
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

create or replace function public.protect_privileged_profile_columns()
returns trigger as $$
begin
  -- Пропускаем без ограничений: серверные операции (service_role — регистрация
  -- через триггер handle_new_user, крон и т.п.), настоящего админа и прямые
  -- операции из Supabase Dashboard (auth.role() = NULL там, JWT отсутствует).
  if auth.role() is null or auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role not in ('artist', 'editor') then
      new.role := 'artist';
    end if;
    if new.role = 'editor' then
      new.editor_status := 'pending';
    else
      new.editor_status := null;
    end if;
    -- Цену эдитора при первичной регистрации согласовывает администратор —
    -- сохранённое "пожелание" из формы регистрации сюда не относится
    -- (это отдельная колонка cover_note/application, не profiles).
    new.price_min := null;
    new.price_max := null;
    return new;
  end if;

  -- UPDATE — та же защита, что и раньше.
  new.role := old.role;
  new.editor_status := old.editor_status;
  new.price_min := old.price_min;
  new.price_max := old.price_max;
  new.active_cap := old.active_cap;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_protect_privileged_profile_columns on public.profiles;
create trigger trg_protect_privileged_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();
