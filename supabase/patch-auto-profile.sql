-- Патч: автосоздание профиля при регистрации (см. пункт 6 в schema.sql).
-- Выполните этот файл в SQL Editor — он не конфликтует с уже применённой схемой.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, role, display_name, bio, editor_status,
    price_min, price_max, telegram, instagram, tiktok, portfolio_url
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
    nullif(new.raw_user_meta_data->>'portfolio_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
