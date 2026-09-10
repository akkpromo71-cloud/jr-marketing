import { dict, type Dict, type Locale } from '@/lib/i18n';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logError } from '@/lib/log-error';
import { SITE_URL } from '@/lib/contacts';

// Почтовые уведомления. Отправка — прямым POST в REST API Resend
// (https://resend.com): отдельная SDK-зависимость ради одного HTTP-запроса не
// нужна. Ключ берётся из RESEND_API_KEY, отправитель — из RESEND_FROM,
// адрес админа — из ADMIN_NOTIFY_EMAIL. Если переменных нет, функции просто
// молча ничего не делают: площадка работает и без настроенной почты.
//
// ГЛАВНОЕ ПРАВИЛО: письмо никогда не должно ломать основное действие.
// Все ошибки ловятся и уходят в лог — наружу из этого файла ничего не летит.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

type EmailDict = Dict['emails'];
type Built = { subject: string; body: string };

interface Recipient {
  email: string;
  locale: Locale;
}

function normalizeLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'ru';
}

// Подставляет значения в строку шаблона: fill('Трек {track}', {track: 'X'}).
export function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(value),
    template
  );
}

// Email лежит в auth.users, а не в profiles — достаём его сервисным ключом
// через admin API. Язык — из profiles.locale (supabase/patch-draft-flow.sql);
// у старых профилей там NULL, тогда пишем по-русски.
async function getRecipient(userId: string): Promise<Recipient | null> {
  try {
    const supabase = await createServiceRoleClient();
    const [{ data: userData }, { data: profile }] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('profiles').select('locale').eq('id', userId).maybeSingle(),
    ]);
    const email = userData?.user?.email;
    if (!email) return null;
    return { email, locale: normalizeLocale(profile?.locale) };
  } catch (err) {
    logError('notify:getRecipient', err, { userId });
    return null;
  }
}

async function send(to: Recipient, built: Built, path: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  // Почта не настроена — это не ошибка, просто тихо выходим.
  if (!apiKey || !from) return;

  const e = dict[to.locale].emails;
  const url = `${SITE_URL}${path}`;
  // Письмо намеренно простое: заголовок, текст, ссылка, подпись. Никакого
  // тяжёлого HTML — такие письма реже уезжают в спам и читаются на телефоне.
  const html = [
    `<p style="margin:0 0 16px">${escapeHtml(built.body)}</p>`,
    `<p style="margin:0 0 16px"><a href="${url}">${escapeHtml(e.openLink)}</a></p>`,
    `<p style="margin:0;color:#888;font-size:12px">${escapeHtml(e.footer)}</p>`,
  ].join('');

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to.email],
        subject: built.subject,
        html,
        text: `${built.body}\n\n${e.openLink}: ${url}\n\n${e.footer}`,
      }),
    });
    if (!res.ok) {
      logError('notify:send', new Error(`resend ${res.status}`), { status: res.status });
    }
  } catch (err) {
    logError('notify:send', err);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Письмо конкретному пользователю площадки, на его языке.
export async function notifyUser(
  userId: string,
  build: (e: EmailDict) => Built,
  path: string
): Promise<void> {
  try {
    const to = await getRecipient(userId);
    if (!to) return;
    await send(to, build(dict[to.locale].emails), path);
  } catch (err) {
    logError('notify:notifyUser', err, { userId });
  }
}

// Письмо администратору площадки. Адрес — из ADMIN_NOTIFY_EMAIL: он один и
// известен владельцу, искать админов в базе для этого не нужно.
export async function notifyAdmin(build: (e: EmailDict) => Built, path: string): Promise<void> {
  try {
    const email = process.env.ADMIN_NOTIFY_EMAIL;
    if (!email) return;
    const locale = normalizeLocale(process.env.ADMIN_NOTIFY_LOCALE);
    await send({ email, locale }, build(dict[locale].emails), path);
  } catch (err) {
    logError('notify:notifyAdmin', err);
  }
}
