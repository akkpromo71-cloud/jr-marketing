import Link from 'next/link';
import { loginAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button, Card, BackLink } from '@/components/ui';
import { getDict } from '@/lib/i18n';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; reset?: string }>;
}) {
  const { error, next, reset } = await searchParams;
  const { t } = await getDict();

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <BackLink href="/" label={t.common.back} />
      <h1 className="mb-1 font-display text-3xl font-medium text-text">{t.login.title}</h1>
      <p className="mb-8 text-sm text-text-dim">{t.login.subtitle}</p>

      <Card className="p-6">
        {reset && !error && (
          <div className="mb-4 rounded-xl border border-[var(--success-tint-border)] bg-[var(--success-tint-bg)] px-4 py-3 text-sm text-success">
            {t.login.resetSuccessMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
            {decodeURIComponent(error)}
          </div>
        )}
        <form action={loginAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? ''} />
          <Field label={t.login.email}>
            <input className={inputClass} type="email" name="email" required placeholder="you@example.com" />
          </Field>
          <Field label={t.login.password}>
            <input className={inputClass} type="password" name="password" required placeholder="••••••••" />
          </Field>
          <Link href="/forgot-password" className="self-end text-xs text-text-faint hover:text-accent hover:underline">
            {t.login.forgotPassword}
          </Link>
          <Button type="submit" variant="primary" className="mt-2 w-full">
            {t.login.submitBtn}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-text-faint">
        {t.login.noAccount}{' '}
        <Link href="/signup/editor" className="text-accent hover:underline">
          {t.login.iAmEditor}
        </Link>{' '}
        ·{' '}
        <Link href="/signup/artist" className="text-accent hover:underline">
          {t.login.iAmArtist}
        </Link>
      </p>
    </main>
  );
}
