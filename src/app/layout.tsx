import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';
import { getLocale } from '@/lib/i18n';

const fraunces = Fraunces({
  // У Fraunces нет кириллического набора — используем его для латиницы/цифр,
  // кириллический текст в заголовках попадёт на системный serif-фоллбэк (см. tailwind.config.ts)
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  // 800 добавлен ради жирного заголовка на лендинге (font-extrabold) — без него
  // браузер подделывал бы жирность синтетически поверх 700.
  weight: ['400', '500', '600', '700', '800'],
});

// applicationName/icons/openGraph.siteName — чтобы бренд "J/R marketing" был виден
// везде (вкладка браузера, установка как приложение, превью ссылки), а не голый хост.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const shared: Partial<Metadata> = {
    applicationName: 'J/R marketing',
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
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${fraunces.variable} ${manrope.variable} font-sans antialiased`}>
        <script
          // Ставим класс .dark до гидратации, чтобы не было "мигания" светлой темой
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
