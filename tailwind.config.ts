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
        // accent — timeline-blue: главная CTA, фокус-ринг, «сторона эдитора».
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
        // primary — magenta: «сторона артиста» (design-system/jr-marketing).
        primary: 'var(--primary)',
        'on-primary': 'var(--on-primary)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        'on-accent': 'var(--on-accent)',
      },
      fontFamily: {
        // display — Unbounded (только дисплейные размеры, не для текста);
        // sans    — Manrope (весь текст/UI);
        // mono    — JetBrains Mono (цифры, бегущая строка). Все три с кириллицей.
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontWeight: {
        // Дизайн-система JR допускает выразительный дисплейный вес. Именованные
        // веса Tailwind переопределены здесь, чтобы не править каждое место с
        // font-medium/semibold/bold по проекту.
        light: '400',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      // Типографическая шкала — резкий контраст дисплейного и служебного
      // размеров (~10×). display/display-sm/headline рендерятся Unbounded'ом
      // (font-display навешивается на соответствующие заголовки).
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.06em' }],
        meta: ['0.75rem', { lineHeight: '1.35', letterSpacing: '0.14em' }],
        body: ['1rem', { lineHeight: '1.7' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.65' }],
        title: ['1.1875rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        // Заголовки: мягче межстрочный (на узком экране плотный lh читается
        // «стеной»), меньше нижняя граница clamp — на мобиле не давит.
        headline: ['clamp(1.45rem, 1.05rem + 1.9vw, 2.5rem)', { lineHeight: '1.18', letterSpacing: '-0.015em' }],
        'display-sm': ['clamp(1.7rem, 1rem + 3vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        display: ['clamp(2.15rem, 1rem + 5.4vw, 5.5rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
      },
      maxWidth: {
        container: '78rem',
        'container-text': '42rem',
      },
      spacing: {
        // Три ступени вертикального ритма секций. На мобиле нижние границы
        // clamp небольшие — секции разделяет ещё и hairline (border-b), так
        // страница читается цельно, а не как разбросанные острова.
        'section-sm': 'clamp(1.75rem, 1.25rem + 1.6vw, 3.5rem)',
        section: 'clamp(2.5rem, 1.5rem + 3.2vw, 5.5rem)',
        'section-lg': 'clamp(3rem, 1.75rem + 4.4vw, 8.5rem)',
        gutter: '1.5rem',
      },
      boxShadow: {
        card: 'none',
        accent: 'none',
        // Тень только для настоящих оверлеев (модалка, дропдаун, тост).
        overlay: '0 16px 40px -12px rgba(0, 0, 0, 0.6)',
      },
      borderRadius: {
        xl2: '0px',
      },
    },
  },
  plugins: [],
};

export default config;
