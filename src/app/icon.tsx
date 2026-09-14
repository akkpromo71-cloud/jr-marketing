import { ImageResponse } from 'next/og';

// Фавиконка через Next.js file convention (заменяет public/favicon.ico) —
// тот же знак, что и в src/components/logo.tsx, отрисован напрямую (внутри
// ImageResponse нет доступа к CSS-переменным из globals.css, поэтому цвета
// продублированы как хекс — совпадают с --bg/--primary).
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg width={32} height={32} viewBox="0 0 64 64">
        <path d="M18 4 H40 L60 24 V46 Q60 60 46 60 H18 Q4 60 4 46 V18 Q4 4 18 4 Z" fill="#1a2333" />
        <path d="M25 21 L25 43 L45 32 Z" fill="#34d399" />
      </svg>
    ),
    { ...size }
  );
}
