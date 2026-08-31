-- Патч: реквизиты выплаты у эдитора (PayPal / криптокошелёк) + доп. поля
-- кампании для карточки трека (Spotify-ссылка и сообщение от менеджера).
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно (add column if not exists / create or replace).

-- =========================================================
-- profiles: куда эдитору присылать оплату
-- =========================================================
alter table public.profiles add column if not exists paypal_email text;
alter table public.profiles add column if not exists crypto_wallet text;

-- =========================================================
-- campaigns: ссылка на Spotify и сообщение от менеджера для эдиторов
-- =========================================================
alter table public.campaigns add column if not exists spotify_url text;
alter table public.campaigns add column if not exists manager_message text;

-- =========================================================
-- Триггер автосоздания профиля (public.handle_new_user) — добавляем
-- paypal_email/crypto_wallet в маппинг из user_metadata, иначе значения,
-- введённые при регистрации, будут молча теряться.
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, role, display_name, bio, editor_status,
    price_min, price_max, telegram, instagram, tiktok, portfolio_url,
    paypal_email, crypto_wallet
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
    nullif(new.raw_user_meta_data->>'portfolio_url', ''),
    nullif(new.raw_user_meta_data->>'paypal_email', ''),
    nullif(new.raw_user_meta_data->>'crypto_wallet', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
