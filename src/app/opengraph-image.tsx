import { ImageResponse } from 'next/og';

// Картинка превью ссылки (Telegram, TikTok bio и т.п.) — 1200×630, фон и цвета
// сайта, фирменный знак и одна строка. Штатная файловая конвенция Next:
// используется и для og:image, и для twitter:image. Знак — тот же инлайн-SVG,
// что и в src/app/icon.tsx/apple-icon.tsx, без чтения файла с диска.
export const alt = 'J/R marketing — клиппинг-платформа: платите за просмотры, зарабатывайте с каждого ролика';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: '#0b0f1a',
          color: '#f4f5f7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width={64} height={64} viewBox="0 0 64 64">
            <path d="M18 4 H40 L60 24 V46 Q60 60 46 60 H18 Q4 60 4 46 V18 Q4 4 18 4 Z" fill="#1a2333" />
            <path d="M25 21 L25 43 L45 32 Z" fill="#34d399" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 800 }}>J/R</div>
        </div>

        <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.15 }}>
          Платите за просмотры. Зарабатывайте с каждого ролика.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 16, height: 16, borderRadius: 99, background: '#34d399' }} />
          <div style={{ width: 16, height: 16, borderRadius: 99, background: '#3b82f6' }} />
          <div style={{ marginLeft: 10, fontSize: 32, letterSpacing: 3, color: '#98a2b3' }}>
            КЛИППИНГ ДЛЯ TIKTOK, REELS И SHORTS
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
