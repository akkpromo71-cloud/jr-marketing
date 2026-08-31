-- Патч: аватарки пользователей (артист и эдитор) через Supabase Storage.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

-- Публичный бакет: файлы читаются без авторизации (аватарки показываются
-- везде на сайте — в ленте для эдиторов, в админ-панели и т.д.), но
-- загружать/менять/удалять может только владелец — см. политики ниже.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Файлы хранятся по пути "{user_id}/avatar.{расширение}" — первая часть
-- пути (storage.foldername) используется политиками ниже, чтобы каждый
-- пользователь мог загружать/менять/удалять только свой собственный файл.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
