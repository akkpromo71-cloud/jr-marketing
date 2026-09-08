import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getLocale } from '@/lib/i18n';

// Редизайн под Monopo Saigon (design-pack/): один шрифт на весь интерфейс
// вместо прежней пары Fraunces (только латиница) + Manrope — у эталона
// Roobert используется одинаково в заголовках, навигации и теле текста.
// Inter выбран как кириллица-совместимая замена (design-pack/design.md,
// раздел Roobert: "Substitute: Inter or Söhne"), веса ограничены 300/400/600
// (design-pack/design.md, Don't: "Never use bold or heavy weights (600+)") —
// см. tailwind.config.ts, где fontWeight.medium/bold/extrabold схлопнуты
// к ближайшему разрешённому весу без правки каждого файла.
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  weight: ['300', '400', '600'],
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
      {/* Пользовательской тёмной темы нет (переключатель удалён при перестройке
          структуры, REDESIGN_PLAN.md §2.5) — есть только чёрные full-bleed
          секции внутри светлой страницы. Класс .dark в globals.css оставлен
          как честная инверсия palette. */}
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
