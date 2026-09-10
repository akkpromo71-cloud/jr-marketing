import type { Metadata, Viewport } from 'next';
import { Unbounded, Manrope } from 'next/font/google';
import './globals.css';
import { getLocale } from '@/lib/i18n';

// Две гарнитуры на весь проект (обе с cyrillic subset):
//   Unbounded — дисплейные заголовки и монограмма в шапке;
//   Manrope   — весь остальной текст, UI, кнопки, лейблы, ЦИФРЫ.
// Переменные --font-display / --font-sans читает tailwind.config.ts.
// Наборы символов — только latin + cyrillic. Начертания сверены с тем, что
// реально встречается в вёрстке (каждое лишнее — отдельный файл в загрузке):
//   Manrope   400 (базовый текст), 500 font-medium, 600 font-semibold,
//             700 font-bold. 800 не используется — единственный font-extrabold
//             на лендинге стоит на .text-display, а это Unbounded.
//   Unbounded 500 (инициал аватара), 600 (.text-headline), 700 (.text-display,
//             .text-display-sm — см. globals.css), 800 (font-extrabold там же).
//             400 не используется, зато 500 раньше не грузился и браузер
//             дорисовывал его сам.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

// applicationName/icons/openGraph.siteName — чтобы бренд "J/R marketing" был виден
// везде (вкладка браузера, установка как приложение, превью ссылки), а не голый хост.
// Картинку превью даёт src/app/opengraph-image.tsx (1200×630), поэтому здесь
// images не задаём — иначе ручной список перекрыл бы файловую конвенцию.
// Без явного initial-scale Next отдаёт только `width=device-width`, и мобильные
// браузеры (заметнее всего Safari на iOS) могут открыть страницу в своём
// масштабе. Аудитория живёт в телефоне, поэтому фиксируем начальный масштаб.
// themeColor — цвет фона сайта в системной строке браузера.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0f1a',
};

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
  // Аналитика — Plausible: без cookies и персональных данных, поэтому не нужен
  // баннер о согласии, а скрипт весит меньше килобайта. Подключается, только
  // если задан NEXT_PUBLIC_PLAUSIBLE_DOMAIN (домен сайта в аккаунте Plausible);
  // без переменной на страницу не попадает вообще ничего.
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang={locale}>
      {/* Тёмная OLED-тема — единственная тема сайта (design-system/jr-marketing).
          Токены заданы на :root в globals.css, отдельного класса-темы нет. */}
      <body
        className={`${manrope.variable} ${unbounded.variable} font-sans antialiased`}
      >
        {children}
        {plausibleDomain && (
          <script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" />
        )}
      </body>
    </html>
  );
}
