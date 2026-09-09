import type { Metadata } from 'next';
import { Unbounded, Manrope } from 'next/font/google';
import './globals.css';
import { getLocale } from '@/lib/i18n';

// Две гарнитуры на весь проект (обе с cyrillic subset):
//   Unbounded — дисплейные заголовки и монограмма в шапке;
//   Manrope   — весь остальной текст, UI, кнопки, лейблы, ЦИФРЫ.
// Переменные --font-display / --font-sans читает tailwind.config.ts.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});
const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  weight: ['400', '600', '700', '800'],
  display: 'swap',
});

// applicationName/icons/openGraph.siteName — чтобы бренд "J/R marketing" был виден
// везде (вкладка браузера, установка как приложение, превью ссылки), а не голый хост.
// Картинку превью даёт src/app/opengraph-image.tsx (1200×630), поэтому здесь
// images не задаём — иначе ручной список перекрыл бы файловую конвенцию.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const shared: Partial<Metadata> = {
    applicationName: 'J/R marketing',
    metadataBase: new URL('https://jr-marketing-psi.vercel.app'),
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
  };
  if (locale === 'en') {
    const title = 'J/R marketing — platform for artists and video editors';
    const description =
      'The platform that connects artists with TikTok/Reels editors: commissioning edits, applications, revisions and moderation, all in one place.';
    return {
      ...shared,
      title,
      description,
      openGraph: { siteName: 'J/R marketing', title, description, locale: 'en_US' },
      twitter: { card: 'summary_large_image', title, description },
    };
  }
  const title = 'J/R marketing — платформа для артистов и видеоэдиторов';
  const description =
    'Площадка, которая соединяет артистов и эдиторов TikTok/Reels: заказ монтажа, заявки, правки и модерация в одном месте.';
  return {
    ...shared,
    title,
    description,
    openGraph: { siteName: 'J/R marketing', title, description, locale: 'ru_RU' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      {/* Тёмная OLED-тема — единственная тема сайта (design-system/jr-marketing).
          Токены заданы на :root в globals.css, отдельного класса-темы нет. */}
      <body
        className={`${manrope.variable} ${unbounded.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
