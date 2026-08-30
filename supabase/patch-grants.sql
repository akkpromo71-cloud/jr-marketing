-- Проверяем и чиним ПРАВА ДОСТУПА к таблицам (это отдельная вещь от RLS-политик).
-- Если у ролей anon/authenticated нет базового права SELECT на таблицу,
-- Postgres молча вернёт 0 строк ещё до применения RLS-политик — снаружи
-- это выглядит один в один как баг с RLS, хотя причина другая.
--
-- Как выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run.

-- 1) Сначала посмотрим, что сейчас реально выдано таблицам (это просто отчёт,
--    ничего не меняет) — результат появится внизу после запуска.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('campaigns', 'profiles', 'applications', 'revision_messages')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 2) На всякий случай выдаём права заново на все 4 таблицы.
--    RLS-политики (уже настроенные ранее) всё равно продолжат ограничивать,
--    КАКИЕ именно строки можно видеть/менять — это просто "включает" саму
--    возможность обращаться к таблице для этих ролей.
grant usage on schema public to anon, authenticated;

grant select, insert, update on public.campaigns to authenticated;
grant select on public.campaigns to anon;

grant select, insert, update on public.applications to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

grant select, insert on public.revision_messages to authenticated;

-- 3) Финальная проверка: после выдачи прав список должен содержать
--    все нужные права для authenticated на campaigns.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('campaigns', 'profiles', 'applications', 'revision_messages')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
