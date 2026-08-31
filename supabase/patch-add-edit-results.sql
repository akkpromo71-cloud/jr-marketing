-- Добавляет поля для результатов промо-эдитов: эдитор заливает готовый эдит
-- на СВОЙ аккаунт и вручную вносит ссылку + просмотры/лайки — эти цифры
-- потом видит артист у себя в кабинете.
--
-- Ничего не удаляет, безопасно выполнять повторно.
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.

alter table public.applications
  add column if not exists posted_url text,
  add column if not exists views_count bigint,
  add column if not exists likes_count bigint,
  add column if not exists result_updated_at timestamptz;

-- Отдельная RLS-политика не нужна: обновлять эти поля может тот, кому уже и
-- так разрешено обновлять заявку (сам эдитор, артист-владелец кампании, админ) —
-- это правило уже настроено политикой applications_update.
