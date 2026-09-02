import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Простой rate limiter поверх отдельной таблицы в Supabase (не in-memory
// счётчик в процессе) — сайт крутится на Vercel как serverless-функции:
// каждый вызов Server Action может обслужить любой из множества независимых
// инстансов, у которых нет общей памяти. Единственное место, до которого
// дотягивается любой инстанс — сама база, которая у площадки и так одна.
//
// Таблица public.rate_limit_events защищена RLS без единой policy — прочитать
// или записать в неё может только service_role-соединение (то же самое,
// что уже используется для одобрения эдиторов, см. createServiceRoleClient
// в src/lib/supabase/server.ts), обычный anon/authenticated-запрос к ней
// доступа не имеет вообще.
//
// key — префикс действия + идентификатор ("login:1.2.3.4", "apply:<user_id>").
// Возвращает true, если действие разрешено (и в этом случае сама же
// регистрирует попытку), false — если лимит уже исчерпан.
export async function checkRateLimit(key: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabase = await createServiceRoleClient();
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from('rate_limit_events')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart);

    // Если таблицы ещё нет (патч supabase/patch-rate-limiting.sql не выполнен)
    // или другая ошибка на стороне БД — не блокируем пользователя, лимит
    // просто ещё не активен, а не "все заблокированы".
    if (countError) return true;

    const allowed = (count ?? 0) < maxAttempts;
    if (allowed) {
      await supabase.from('rate_limit_events').insert({ key });
    }

    // Самоочистка без отдельного крона: изредка (примерно раз на 200 вызовов)
    // подчищаем отметки старше суток — самое длинное используемое окно ниже
    // намного короче, старые строки никому не нужны.
    if (Math.random() < 0.005) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('rate_limit_events').delete().lt('created_at', dayAgo);
    }

    return allowed;
  } catch {
    return true;
  }
}

// IP клиента из заголовков, которые проставляет прокси Vercel перед
// serverless-функцией. 'unknown' в крайне маловероятном случае, когда
// заголовков нет вовсе (например, локальный запуск без прокси) — тогда все
// такие запросы делят один лимит, что не идеально, но безопаснее, чем совсем
// без лимита.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = h.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
