import Link from 'next/link';
import { forgotPasswordAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button, Card, BackLink } from '@/components/ui';
import { getDict } from '@/lib/i18n';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const { t } = await getDict();

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <BackLink href="/login" label={t.common.back} />
      <h1 className="mb-1 font-display text-3xl font-medium text-text">{t.forgotPassword.title}</h1>
      <p className="mb-8 text-sm text-text-dim">{t.forgotPassword.subtitle}</p>

      <Card className="p-6">
        {sent ? (
          <p className="text-sm text-text-dim">{t.forgotPassword.sentMsg}</p>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
                {decodeURIComponent(error)}
              </div>
            )}
            <form action={forgotPasswordAction} className="flex flex-col gap-4">
              <Field label={t.login.email}>
                <input className={inputClass} type="email" name="email" required placeholder="you@example.com" />
              </Field>
              <Button type="submit" variant="primary" className="mt-2 w-full">
                {t.forgotPassword.submitBtn}
              </Button>
            </form>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-sm text-text-faint">
        <Link href="/login" className="text-accent hover:underline">
          {t.forgotPassword.backToLogin}
        </Link>
      </p>
    </main>
  );
}

