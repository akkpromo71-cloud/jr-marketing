import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Юнит-тесты только для чистых функций (src/lib/validate.ts, src/lib/i18n.ts) —
// без jsdom/React Testing Library и без рендера компонентов: полноценное
// тестирование Server Actions и страниц потребовало бы гораздо более тяжёлой
// настройки (мок Supabase, Next.js request-контекста и т.д.). Здесь
// проверяется логика, которую проще всего незаметно сломать при правках —
// это лучше, чем совсем без тестов, а не попытка покрыть всё сразу.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
