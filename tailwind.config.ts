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
        display: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-manrope)', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        accent: 'var(--accent-shadow)',
      },
      borderRadius: {
        xl2: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
