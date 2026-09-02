-- Патч: CHECK-ограничения на числовые столбцы (бюджет, цена, счётчики).
--
-- Контекст: валидация "цена/бюджет не может быть отрицательным" до сих пор
-- существовала только на уровне приложения (src/lib/validate.ts,
-- positiveNumberOrNull, HTML min="0" на инпутах) — сама база принимала любое
-- число. Приложение сегодня действительно нигде не пишет отрицательные
-- значения, но это ничего не гарантирует на будущее: баг в новом коде, ручная
-- правка через SQL Editor или прямой вызов Supabase API в обход UI — и в
-- базе оказываются данные, которые сайт не умеет корректно показывать
-- (например, отрицательный budget/price или views_count, "съеденный" багом
-- парсера статистики TikTok). Это последний рубеж защиты, а не замена
-- проверкам в коде.
--
-- Перед добавлением ограничений подчищаем возможные уже существующие "плохие"
-- значения — иначе ALTER TABLE ... ADD CONSTRAINT упадёт на первой же
-- нарушающей строке. Если данные уже корректны, эти UPDATE ничего не тронут.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.
-- Безопасно выполнять повторно.

-- ---- подчистка существующих данных ----
update public.profiles set price_min = null where price_min < 0;
update public.profiles set price_max = null where price_max < 0;
update public.profiles set active_cap = 0 where active_cap < 0;
update public.campaigns set budget = null where budget < 0;
update public.campaigns set max_editors = 1 where max_editors < 1;
update public.applications set price = null where price < 0;
update public.applications set views_count = null where views_count < 0;
update public.applications set likes_count = null where likes_count < 0;

-- ---- profiles ----
alter table public.profiles drop constraint if exists profiles_price_min_nonneg;
alter table public.profiles add constraint profiles_price_min_nonneg check (price_min is null or price_min >= 0);

alter table public.profiles drop constraint if exists profiles_price_max_nonneg;
alter table public.profiles add constraint profiles_price_max_nonneg check (price_max is null or price_max >= 0);

-- Верхняя граница цены не должна быть ниже нижней (сегодня форма пишет одно
-- и то же значение в оба столбца, но ограничение защищает от рассинхрона).
alter table public.profiles drop constraint if exists profiles_price_range;
alter table public.profiles add constraint profiles_price_range
  check (price_min is null or price_max is null or price_max >= price_min);

alter table public.profiles drop constraint if exists profiles_active_cap_nonneg;
alter table public.profiles add constraint profiles_active_cap_nonneg check (active_cap is null or active_cap >= 0);

-- ---- campaigns ----
alter table public.campaigns drop constraint if exists campaigns_budget_nonneg;
alter table public.campaigns add constraint campaigns_budget_nonneg check (budget is null or budget >= 0);

alter table public.campaigns drop constraint if exists campaigns_max_editors_positive;
alter table public.campaigns add constraint campaigns_max_editors_positive check (max_editors > 0);

-- ---- applications ----
alter table public.applications drop constraint if exists applications_price_nonneg;
alter table public.applications add constraint applications_price_nonneg check (price is null or price >= 0);

alter table public.applications drop constraint if exists applications_views_count_nonneg;
alter table public.applications add constraint applications_views_count_nonneg
  check (views_count is null or views_count >= 0);

alter table public.applications drop constraint if exists applications_likes_count_nonneg;
alter table public.applications add constraint applications_likes_count_nonneg
  check (likes_count is null or likes_count >= 0);

-- =========================================================
-- Готово. Проверить: в SQL Editor выполнить
--   update public.campaigns set budget = -1 where id = (select id from public.campaigns limit 1);
-- — должна вернуться ошибка "violates check constraint", а не тихое
-- сохранение. После проверки не забудьте не оставлять реальный budget = -1.
-- =========================================================

