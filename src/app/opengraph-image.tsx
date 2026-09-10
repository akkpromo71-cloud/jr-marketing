import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Картинка превью ссылки (Telegram, TikTok bio и т.п.) — 1200×630, фон и цвета
// сайта, фирменный знак и одна строка. Штатная файловая конвенция Next:
// используется и для og:image, и для twitter:image. Собирается на этапе сборки,
// поэтому чтение файла с диска здесь ничего не стоит в рантайме.
export const alt = 'J/R marketing — трек артиста, монтаж эдитора, просмотры';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// satori (движок ImageResponse) умеет PNG/JPEG, но не WebP — поэтому берём
// PNG-версию знака, а не ту webp, что стоит в интерфейсе.
async function logoDataUri(): Promise<string | null> {
  try {
    const file = await readFile(join(process.cwd(), 'public', 'logo-mark.png'));
    return `data:image/png;base64,${file.toString('base64')}`;
  } catch {
    // Файла нет или его не прочитать — рисуем превью без знака, но не роняем сборку.
    return null;
  }
}

export default async function OpengraphImage() {
  const logo = await logoDataUri();

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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" height={172} width={219} />
          ) : (
            <div style={{ fontSize: 56, fontWeight: 800 }}>J/R marketing</div>
          )}
        </div>

        <div style={{ display: 'flex', fontSize: 82, fontWeight: 800, lineHeight: 1.1 }}>
          Трек артиста. Монтаж эдитора. Просмотры.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 16, height: 16, borderRadius: 99, background: '#ec4899' }} />
          <div style={{ width: 16, height: 16, borderRadius: 99, background: '#3b82f6' }} />
          <div style={{ marginLeft: 10, fontSize: 32, letterSpacing: 3, color: '#98a2b3' }}>
            ПРОДВИЖЕНИЕ В TIKTOK И REELS
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
