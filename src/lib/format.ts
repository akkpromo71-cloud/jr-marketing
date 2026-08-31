import type { Locale } from '@/lib/i18n';

// Компактный формат больших чисел просмотров/лайков: 12500 -> "12,5 тыс." (ru) / "12.5K" (en).
// Intl.NumberFormat с notation: 'compact' работает и на сервере (Node) без доп. библиотек.
export function formatCompactNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}
