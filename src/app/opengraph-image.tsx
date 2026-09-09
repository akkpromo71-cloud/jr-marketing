import { ImageResponse } from 'next/og';

// Картинка превью ссылки (Telegram, TikTok bio и т.п.) — 1200×630, тёмная,
// в фирменных цветах. Штатная файловая конвенция Next: используется и для
// og:image, и для twitter:image. Кастомные шрифты не подгружаем — для OG
// системного sans достаточно.
export const alt = 'J/R marketing — площадка для артистов и видеоэдиторов TikTok/Reels';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
        <div style={{ fontSize: 34, letterSpacing: 4, textTransform: 'uppercase', color: '#98a2b3' }}>
          Продвижение в TikTok и Reels
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 92, fontWeight: 800, lineHeight: 1.08 }}>
          <span>Трек артиста.</span>
          <span>Монтаж эдитора.</span>
          <span>Просмотры.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 16, height: 16, borderRadius: 99, background: '#ec4899' }} />
          <div style={{ width: 16, height: 16, borderRadius: 99, background: '#3b82f6' }} />
          <div style={{ marginLeft: 10, fontSize: 34, color: '#c7cdd9' }}>J/R marketing</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
