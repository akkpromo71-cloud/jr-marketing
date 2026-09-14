import { ImageResponse } from 'next/og';

// Apple touch icon — тот же знак, крупнее и с полями (iOS сам скругляет
// углы под свою сетку, поэтому здесь квадратная плашка без прозрачности).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f1a',
        }}
      >
        <svg width={120} height={120} viewBox="0 0 64 64">
          <path d="M18 4 H40 L60 24 V46 Q60 60 46 60 H18 Q4 60 4 46 V18 Q4 4 18 4 Z" fill="#1a2333" />
          <path d="M25 21 L25 43 L45 32 Z" fill="#34d399" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
