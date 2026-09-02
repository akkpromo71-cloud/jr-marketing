// Небольшие серверные проверки пользовательского ввода — отдельным файлом,
// чтобы одна и та же логика не расходилась между разными server actions.

// Разрешаем сохранять/рендерить ссылку только если это обычный http(s)-адрес.
// Без этой проверки в поля вроде track_url/submission_url/posted_url можно
// было сохранить "javascript:..." — при клике по такой ссылке на странице
// (<a href={url}>) код выполнился бы в браузере того, кто на неё нажал
// (например, администратора, открывающего сданную работу эдитора).
export function safeUrl(input: FormDataEntryValue | null | undefined): string | null {
  const value = String(input ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return value;
  } catch {
    return null;
  }
}

// Оценка в отзывах должна быть целым числом от 1 до 5 — без этого в базу
// можно было отправить любое число (0, отрицательное, 999 и т.д.).
export function clampRating(input: FormDataEntryValue | null | undefined): number {
  const n = Math.round(Number(input ?? 5));
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, n));
}

// Денежные суммы (бюджет, цена) — должны быть положительными или отсутствовать.
export function positiveNumberOrNull(input: FormDataEntryValue | null | undefined): number | null {
  const n = Number(input ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
