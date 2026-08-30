import { createClient } from '@/lib/supabase/server';
import type { Profile, Role } from '@/lib/types';

// Возвращает текущего авторизованного пользователя вместе с его профилем (profiles),
// либо null, если пользователь не залогинен.
//
// Профиль обычно создаёт триггер public.handle_new_user() в БД сразу при регистрации
// (см. supabase/schema.sql). Но если по какой-то причине строки в profiles ещё нет
// (например, пользователь был создан вручную через Supabase Dashboard без метаданных,
// либо триггер не установлен/не сработал) — подстраховываемся и создаём профиль
// прямо здесь, на лету, из user_metadata. Это гарантирует, что залогиненный
// пользователь никогда не "зависает" без профиля.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) return profile as Profile;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = ((meta.role as Role) ?? 'artist') as Role;
  const toNumber = (v: unknown) => (v !== undefined && v !== null && v !== '' ? Number(v) : null);
  const toText = (v: unknown) => (v ? String(v) : null);

  const { data: created } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      role,
      display_name: toText(meta.display_name) || user.email?.split('@')[0] || 'Без имени',
      bio: toText(meta.bio),
      editor_status: role === 'editor' ? 'pending' : null,
      price_min: toNumber(meta.price_min),
      price_max: toNumber(meta.price_max),
      telegram: toText(meta.telegram),
      instagram: toText(meta.instagram),
      tiktok: toText(meta.tiktok),
      portfolio_url: toText(meta.portfolio_url),
    })
    .select('*')
    .single();

  return (created as Profile) ?? null;
}
