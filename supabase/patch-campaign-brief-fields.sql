-- Патч: расширенный бриф кампании — дедлайн, правило публикации (название трека
-- для описания + ник артиста), фрагмент трека, референсы и ограничения.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно (add column if not exists).
--
-- Все колонки NULLable: существующие кампании открываются без изменений,
-- обязательность новых полей обеспечивается формой и серверным экшеном
-- (src/app/dashboard/new/page.tsx, src/app/dashboard/actions.ts).

-- =========================================================
-- campaigns: поля брифа для эдитора
-- =========================================================

-- Дата, до которой нужен готовый эдит. Проверка «не раньше завтра» —
-- на уровне приложения (futureDateOrNull в src/lib/validate.ts).
alter table public.campaigns add column if not exists deadline date;

-- Точная строка с названием трека, которую эдитор копирует в описание
-- своего ролика. Заполняется всегда (по умолчанию = название кампании).
alter table public.campaigns add column if not exists track_title_for_caption text;

-- Ник артиста / хэштеги — если задано, эдитор дописывает в описание.
alter table public.campaigns add column if not exists artist_handle text;

-- Какой фрагмент трека монтировать («0:45–1:05»). Пусто = на усмотрение эдитора.
alter table public.campaigns add column if not exists track_segment text;

-- До 3 ссылок-референсов (примеры эдитов, которые нравятся артисту).
alter table public.campaigns add column if not exists reference_urls text[];

-- Чего не должно быть в ролике (короткая заметка).
alter table public.campaigns add column if not exists restrictions text;
