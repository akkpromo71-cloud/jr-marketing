-- Патч: черновик до публикации, проверка «живости» поста, язык для писем.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно (add column if not exists).
--
-- Все колонки NULLable либо с DEFAULT: существующие заявки и профили
-- открываются без изменений, старый порядок работы не ломается.

-- =========================================================
-- applications: черновик и состояние опубликованного поста
-- =========================================================

-- Ссылка на ЧЕРНОВИК ролика (файл или закрытое видео), который эдитор сдаёт
-- на приёмку ДО публикации. Раньше эдитор сразу выкладывал готовый ролик на
-- свой аккаунт, и правка означала снести пост вместе с набранными просмотрами.
-- Порядок теперь: черновик -> приёмка -> публикация -> ссылка на пост.
alter table public.applications add column if not exists draft_url text;

-- Когда последний раз проверяли, что опубликованный пост ещё существует,
-- и результат этой проверки. Заполняет крон /api/cron/post-liveness.
alter table public.applications add column if not exists post_checked_at timestamptz;
alter table public.applications add column if not exists post_missing boolean not null default false;

-- =========================================================
-- profiles: язык интерфейса — нужен, чтобы письмо уходило на языке получателя
-- =========================================================

-- Пишется при смене языка в интерфейсе (src/lib/locale-actions.ts) и при
-- регистрации. NULL у старых профилей — тогда письмо уходит на русском.
alter table public.profiles add column if not exists locale text;

-- Отдельные RLS-политики не нужны: все колонки выше живут в таблицах, права
-- на которые уже описаны политиками applications_update / applications_select
-- и profiles_update_self_or_admin (см. supabase/schema.sql и
-- supabase/patch-security-hardening.sql).
