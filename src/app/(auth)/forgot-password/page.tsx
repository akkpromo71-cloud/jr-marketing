import Link from 'next/link';
import { forgotPasswordAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
import { getDict } from '@/lib/i18n';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const { t } = await getDict();

  return (
    <AuthShell
      title={t.forgotPassword.title}
      subtitle={t.forgotPassword.subtitle}
      brandLine={t.forgotPassword.title}
      backHref="/login"
    >
      {sent ? (
        <p className="text-body text-text-dim">{t.forgotPassword.sentMsg}</p>
      ) : (
        <>
          {error && (
            <div className="mb-6 rounded-none border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={forgotPasswordAction} className="flex flex-col gap-5">
            <Field label={t.login.email}>
              <input className={inputClass} type="email" name="email" required placeholder="you@example.com" />
            </Field>
            <Button type="submit" variant="primary" className="mt-1 w-full">
              {t.forgotPassword.submitBtn}
            </Button>
          </form>
        </>
      )}

      <p className="mt-8 border-t border-border pt-6 text-sm text-text-faint">
        <Link href="/login" className="text-accent hover:underline">
          {t.forgotPassword.backToLogin}
        </Link>
      </p>
    </AuthShell>
  );
}
