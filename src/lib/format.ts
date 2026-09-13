import type { Locale } from '@/lib/i18n';

// Компактный формат больших чисел просмотров/лайков: 12500 -> "12,5 тыс." (ru) / "12.5K" (en).
// Intl.NumberFormat с notation: 'compact' работает и на сервере (Node) без доп. библиотек.
export function formatCompactNumber(n: number, locale: Locale): string {
  const s = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
  // Узкий неразрывный пробел между числом и единицей ("166,6 тыс.") — в
  // моноширинном шрифте обычный пробел даёт заметный разрыв перед "тыс.".
  return s.replace(/[  ]/g, ' ');
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// Следующий запуск ежесуточного крона просмотров (/api/cron/clipping-stats,
// "0 7 * * *" в vercel.json) — чтобы в кабинете было видно не абстрактное
// "раз в сутки", а конкретное время. Держим час крона одним числом здесь,
// а не тянем cron-строку из vercel.json (тот файл не импортируется в рантайме).
export function nextDailyCronAt(hourUtc: number, now: Date = new Date()): Date {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
