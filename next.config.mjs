/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Базовые security-заголовки — не было ни одного до этого патча.
  // Осознанно не добавляем Content-Security-Policy здесь: у Next.js
  // инлайновый скрипт гидратации, и правильный CSP требует nonce'ов
  // (через middleware) — грубая заглушка рискует сломать сайт целиком,
  // поэтому это отдельная, более аккуратная задача на будущее.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Запрещаем показывать сайт в <iframe> на чужих доменах — защита
          // от clickjacking (кликджекинга).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Запрещаем браузеру угадывать тип файла по содержимому — иначе
          // например .txt с HTML-разметкой внутри мог бы отрендериться как
          // страница вместо обычного текста.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Не передаём полный URL текущей страницы при переходе на чужой
          // сайт по ссылке — только домен.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Сайт не использует камеру/микрофон/геолокацию/оплату через
          // браузерные API — явно запрещаем их для вкладки.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Требуем HTTPS у браузера на год вперёд (сайт и так на Vercel,
          // который всегда HTTPS, — это дополнительная защита от случайного
          // перехода по http:// ссылке из старого письма/закладки).
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
