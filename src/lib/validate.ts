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

// Дедлайн кампании — дата в формате YYYY-MM-DD, не раньше завтрашнего дня
// (сравнение по календарным датам в UTC, время суток не учитываем).
// Возвращает нормализованную строку YYYY-MM-DD либо null, если ввод пустой
// или невалидный.
export function futureDateOrNull(input: FormDataEntryValue | null | undefined): string | null {
  const raw = String(input ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (date.getTime() <= todayUTC) return null;
  return raw;
}

// Свободный текст из формы: обрезаем пробелы по краям и режем по верхней
// границе длины. Без потолка одно поле (название, описание, сопроводительное
// сообщение) может принять несколько мегабайт — они осядут в БД и будут
// рендериться на каждой карточке. Пустую строку превращаем в null.
export function clampText(
  input: FormDataEntryValue | null | undefined,
  max: number
): string | null {
  const v = String(input ?? '').trim().slice(0, max);
  return v || null;
}

// Небольшое положительное целое (например «сколько эдитов нужно») с потолком.
// Мусор/ноль/отрицательное → fallback, а не тихий отказ на уровне БД-констрейнта.
export function smallPositiveInt(
  input: FormDataEntryValue | null | undefined,
  fallback: number,
  max = 20
): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

// Счётчики вроде подписчиков — только целое неотрицательное число (0 — тоже
// валидное значение, в отличие от positiveNumberOrNull выше) или отсутствует.
export function nonNegativeIntOrNull(input: FormDataEntryValue | null | undefined): number | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
