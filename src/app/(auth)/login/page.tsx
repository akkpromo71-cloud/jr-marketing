import Link from 'next/link';
import { loginAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
import { getDict } from '@/lib/i18n';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; reset?: string }>;
}) {
  const { error, next, reset } = await searchParams;
  const { t } = await getDict();

  return (
    <AuthShell
      title={t.login.title}
      subtitle={t.login.subtitle}
      brandLine={t.login.title}
      backHref="/"
    >
      {reset && !error && (
        <div className="mb-6 rounded-none border border-[var(--success-tint-border)] bg-[var(--success-tint-bg)] px-4 py-3 text-sm text-success">
          {t.login.resetSuccessMsg}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-none border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={loginAction} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next ?? ''} />
        <Field label={t.login.email}>
          <input className={inputClass} type="email" name="email" required placeholder="you@example.com" />
        </Field>
        <Field label={t.login.password}>
          <input className={inputClass} type="password" name="password" required placeholder="••••••••" />
        </Field>
        <Link
          href="/forgot-password"
          className="self-end text-xs text-text-faint transition hover:text-accent hover:underline"
        >
          {t.login.forgotPassword}
        </Link>
        <Button type="submit" variant="primary" className="mt-1 w-full">
          {t.login.submitBtn}
        </Button>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-sm text-text-faint">
        {t.login.noAccount}{' '}
        <Link href="/signup/editor" className="text-accent hover:underline">
          {t.login.iAmEditor}
        </Link>{' '}
        ·{' '}
        <Link href="/signup/artist" className="text-accent hover:underline">
          {t.login.iAmArtist}
        </Link>
      </p>
    </AuthShell>
  );
}
