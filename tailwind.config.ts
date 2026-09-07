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
