import type { Metadata } from 'next';
import { Unbounded, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { getLocale } from '@/lib/i18n';

// Дизайн-система "JR Marketing" (design-system/jr-marketing/MASTER.md): тёмная
// OLED-тема на весь сайт. Шрифтовая пара обязана поддерживать кириллицу —
// все три семейства поставляют cyrillic subset:
//   Unbounded      — дисплейные заголовки (H1-H2, кикеры), "афиша лейбла";
//   Manrope        — весь текст, UI, кнопки, лейблы; спокойный, читаемый;
//   JetBrains Mono — цифры, бегущая строка, номера слотов (табличные знаки).
// Переменные --font-display / --font-sans / --font-mono читает tailwind.config.ts.
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
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

// applicationName/icons/openGraph.siteName — чтобы бренд "J/R marketing" был виден
// везде (вкладка браузера, установка как приложение, превью ссылки), а не голый хост.
// metadataBase + openGraph/twitter.images — чтобы ссылка на сайт в мессенджерах
// и соцсетях разворачивалась с превью-картинкой (логотипом), а не голым текстом.
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
      openGraph: { siteName: 'J/R marketing', title, description, locale: 'en_US', images: ['/logo.png'] },
      twitter: { card: 'summary_large_image', title, description, images: ['/logo.png'] },
    };
  }
  const title = 'J/R marketing — платформа для артистов и видеоэдиторов';
  const description =
    'Площадка, которая соединяет артистов и эдиторов TikTok/Reels: заказ монтажа, заявки, правки и модерация в одном месте.';
  return {
    ...shared,
    title,
    description,
    openGraph: { siteName: 'J/R marketing', title, description, locale: 'ru_RU', images: ['/logo.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/logo.png'] },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      {/* Тёмная OLED-тема — единственная тема сайта (design-system/jr-marketing).
          Токены заданы на :root в globals.css, отдельного класса-темы нет. */}
      <body
        className={`${manrope.variable} ${unbounded.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
