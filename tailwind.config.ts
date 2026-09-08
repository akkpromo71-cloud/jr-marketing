import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-faint': 'var(--text-faint)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        'on-accent': 'var(--on-accent)',
      },
      fontFamily: {
        // Редизайн под Monopo Saigon (design-pack/): у эталона один шрифт
        // (Roobert) на весь интерфейс — заголовки, навигация, текст.
        // Inter — кириллица-совместимая замена (design-pack/design.md сам
        // называет Inter официальным substitute для Roobert). font-display
        // и font-sans намеренно указывают на один и тот же шрифт: так все
        // ~50 существующих мест с классом font-display остаются рабочими
        // без правки каждого файла по отдельности.
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        // Эталон разрешает только веса 300/400/600 (design-pack/design.md,
        // Don't: "Never use bold or heavy weights (600+) above 45px").
        // Переопределяем сами именованные веса Tailwind вместо правки
        // ~100 мест использования font-medium/font-semibold/font-bold/
        // font-extrabold по всему проекту — medium/bold/extrabold схлопываются
        // к ближайшему разрешённому весу.
        light: '300',
        normal: '400',
        medium: '400',
        semibold: '600',
        bold: '600',
        extrabold: '600',
      },
      // Типографическая шкала «ведомости» (REDESIGN_PLAN.md §2.1) — резкий
      // контраст дисплейного и служебного размеров (~10×), которого не было.
      // Через extend, поэтому дефолтные text-xs…text-6xl остаются рабочими
      // для нетронутых мест.
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.06em' }],
        meta: ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.14em' }],
        body: ['1rem', { lineHeight: '1.65' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.6' }],
        title: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        headline: ['clamp(1.6rem, 1.1rem + 2.4vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(2.1rem, 1.2rem + 4vw, 3.75rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        display: ['clamp(2.75rem, 1rem + 7vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
      },
      maxWidth: {
        container: '72rem',
        'container-text': '42rem',
      },
      spacing: {
        section: 'clamp(4rem, 2rem + 9vw, 9rem)',
        gutter: '1.5rem',
      },
      boxShadow: {
        // Эталон запрещает elevation/box-shadow полностью (design-pack/design.md,
        // Elevation: "deliberately avoids shadow elevation"). Обнулено здесь на
        // случай мест, ещё не зачищенных от классов shadow-card/shadow-accent.
        card: 'none',
        accent: 'none',
      },
      borderRadius: {
        xl2: '0px',
      },
    },
  },
  plugins: [],
};

export default config;
