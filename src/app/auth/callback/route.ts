import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/log-error';

// Обрабатывает редирект после подтверждения email / magic link от Supabase Auth.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Не меняем поведение редиректа — раньше эта ошибка терялась молча.
    // Ссылка могла устареть или уже быть использована; страница назначения
    // (например /reset-password) сама проверяет наличие сессии и покажет
    // понятное сообщение, если её не оказалось.
    if (error) logError('auth/callback', error);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
