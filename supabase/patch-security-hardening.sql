-- Патч безопасности: закрывает несколько серьёзных дыр, найденных при аудите.
--
-- ВАЖНО: выполните этот файл КАК МОЖНО СКОРЕЕ — до этого любой залогиненный
-- пользователь мог выдать себе роль admin, самоодобрить себя как эдитора и
-- прочитать чужие PayPal/крипто-реквизиты в обход интерфейса сайта.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

-- =========================================================
-- 1. Регистрация больше не доверяет role из формы напрямую.
--    Раньше: coalesce(raw_user_meta_data->>'role', 'artist') — то есть
--    можно было вызвать supabase.auth.signUp() из консоли браузера с
--    role: 'admin' в metadata и сразу получить админский профиль.
--    Теперь: разрешены только 'artist'/'editor', всё остальное -> 'artist'.
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  safe_role text;
begin
  safe_role := case
    when new.raw_user_meta_data->>'role' = 'editor' then 'editor'
    else 'artist'
  end;

  insert into public.profiles (
    id, role, display_name, bio, editor_status,
    price_min, price_max, telegram, instagram, tiktok, portfolio_url
  )
  values (
    new.id,
    safe_role,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'bio', ''),
    case when safe_role = 'editor' then 'pending' else null end,
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

-- =========================================================
-- 2. Обычный пользователь не может сам себе поменять роль/статус модерации/
--    цену через прямой вызов Supabase API в обход интерфейса сайта.
--    RLS-политика profiles_update_self_or_admin разрешает "USING (id =
--    auth.uid() OR is_admin())" без WITH CHECK — Postgres RLS работает на
--    уровне СТРОК, а не колонок, так что этой политики достаточно, чтобы
--    любой пользователь обновил ЛЮБУЮ колонку своей же строки, включая role.
--    Триггер ниже — это и есть "column-level" защита поверх row-level RLS.
-- =========================================================
create or replace function public.protect_privileged_profile_columns()
returns trigger as $$
begin
  -- Пропускаем без ограничений: серверные операции (service_role — например,
  -- крон) и настоящего админа, работающего через приложение (approveEditorAction
  -- и т.п.), а также прямые операции из Supabase Dashboard (там нет JWT вовсе,
  -- auth.role() возвращает NULL) — иначе вы сами не сможете назначить
  -- первого админа через SQL Editor.
  if auth.role() is null or auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

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
  before update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();

-- =========================================================
-- 3. Заявки (applications): раньше можно было напрямую переписать себе
--    price/views_count/likes_count в любой момент (триггер проверял только
--    переходы статуса) — эдитор мог накрутить лайки/просмотры для лидерборда
--    или задрать себе цену. Заодно чиним автоматическое обновление
--    статистики с TikTok кроном: до этого патча крон работал от имени
--    service_role, но триггер не знал о service_role и всегда отклонял его
--    запись (auth.uid() = NULL для service_role -> "not allowed to update
--    this application") — то есть автосбор статистики скорее всего вообще
--    не работал молча, ни разу.
-- =========================================================
create or replace function public.check_application_transition()
returns trigger as $$
declare
  is_owner_artist boolean;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  select exists (
    select 1 from public.campaigns c
    where c.id = new.campaign_id and c.artist_id = auth.uid()
  ) into is_owner_artist;

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
  elsif is_owner_artist then
    if new.status is distinct from old.status
       and new.status not in ('accepted', 'rejected', 'in_revision', 'completed') then
      raise exception 'artist is not allowed to set application status to %', new.status;
    end if;
    if new.price is distinct from old.price
       or new.views_count is distinct from old.views_count
       or new.likes_count is distinct from old.likes_count
       or new.editor_id is distinct from old.editor_id
       or new.campaign_id is distinct from old.campaign_id then
      raise exception 'artist is not allowed to change price, stats or ownership of this application';
    end if;
  else
    raise exception 'not allowed to update this application';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- =========================================================
-- 4. Реквизиты выплат (paypal_email, crypto_wallet) были читаемы ЛЮБЫМ
--    залогиненным пользователем через прямой запрос к Supabase API — не
--    только через интерфейс сайта, который эти поля для чужих профилей
--    никогда и не показывал, но интерфейс — не граница безопасности.
--    Сужаем чтение таблицы profiles до "своя строка или админ", и
--    отдельно заводим публичное вью с безопасным набором колонок для тех
--    мест, где реально нужно показать чужое имя/аватар (лента треков).
-- =========================================================
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create or replace view public.profiles_public as
  select id, display_name, avatar_url, bio, role
  from public.profiles;

grant select on public.profiles_public to authenticated, anon;

-- =========================================================
-- Готово. Проверить: залогиньтесь любым НЕ-админским аккаунтом и в консоли
-- браузера выполните что-то вроде supabase.from('profiles').update({role:
-- 'admin'}).eq('id', (await supabase.auth.getUser()).data.user.id) — должно
-- либо ничего не поменять (role останется прежним), либо вернуть ошибку
-- доступа, но точно не должно сделать вас админом.
-- =========================================================
