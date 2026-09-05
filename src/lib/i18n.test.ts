import { describe, it, expect } from 'vitest';
import { dict } from './i18n';

// Собираем все "пути" ключей объекта (a.b.c) рекурсивно, чтобы сравнить
// структуру словарей ru и en целиком. При такой большой и часто
// редактируемой таблице переводов легко добавить строку в один язык и
// забыть про другой — тест ловит именно это, с понятным списком путей,
// которые разошлись, а не просто "где-то что-то не так".
function collectKeyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) =>
    collectKeyPaths(v, prefix ? `${prefix}.${key}` : key)
  );
}

describe('i18n dictionary key parity', () => {
  it('ru and en expose exactly the same set of keys', () => {
    const ruKeys = collectKeyPaths(dict.ru).sort();
    const enKeys = collectKeyPaths(dict.en).sort();
    expect(enKeys).toEqual(ruKeys);
  });
});

