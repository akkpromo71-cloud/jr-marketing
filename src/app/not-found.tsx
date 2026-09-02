import { Nav } from '@/components/nav';
import { Card, LinkButton } from '@/components/ui';
import { getDict } from '@/lib/i18n';

// Next.js рендерит эту страницу вместо стандартного шаблона Vercel/Next.js,
// когда notFound() вызван явно (см. applications/[id]/page.tsx,
// dashboard/campaigns/[id]/page.tsx) или когда роут вообще не совпал ни с
// одним файлом — например, при опечатке в ссылке.
export default async function NotFound() {
  const { t } = await getDict();

  return (
    <>
      <Nav />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <Card className="w-full p-8">
          <p className="text-5xl" aria-hidden="true">
            🔍
          </p>
          <h1 className="mt-4 font-display text-2xl font-medium text-text">{t.notFound.title}</h1>
          <p className="mt-2 text-sm text-text-dim">{t.notFound.text}</p>
          <LinkButton href="/" variant="primary" className="mt-6">
            {t.notFound.backHome}
          </LinkButton>
        </Card>
      </main>
    </>
  );
}
