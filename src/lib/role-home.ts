import type { Role } from '@/lib/types';

// Единая точка истины для "домашней" страницы каждой роли — используется
// и после логина/регистрации, и как guard на страницах, предназначенных
// только для конкретной роли (см. src/app/dashboard/page.tsx, src/app/feed/page.tsx и т.д.)
export function roleHome(role?: Role | null) {
  if (role === 'editor') return '/feed';
  if (role === 'artist') return '/dashboard';
  if (role === 'admin') return '/admin';
  return '/';
}
