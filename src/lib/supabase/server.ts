import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Клиент Supabase для использования в Server Components / Server Actions / Route Handlers.
// Читает и (когда возможно) обновляет cookies сессии.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // setAll вызывается из Server Component без возможности записи cookie —
            // это ожидаемо, если параллельно работает middleware, обновляющий сессию.
          }
        },
      },
    }
  );
}

// Клиент с service_role ключом — обходит RLS. Использовать ТОЛЬКО в защищённых
// серверных действиях (например, финальное одобрение эдитора админом),
// никогда не импортировать в клиентский код.
export async function createServiceRoleClient() {
  const { createClient: createRawClient } = await import('@supabase/supabase-js');
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
