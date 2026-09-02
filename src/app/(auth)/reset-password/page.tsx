import { resetPasswordAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button, Card, BackLink, LinkButton } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getDict();

  // Сессия восстановления устанавливается в /auth/callback при переходе по
  // ссылке из письма (обмен code -> session, тот же механизм, что и для
  // подтверждения email). Если сессии нет — ссылка либо устарела, либо
  // страницу открыли напрямую без перехода по письму.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <BackLink href="/login" label={t.common.back} />
      <h1 className="mb-1 font-display text-3xl font-medium text-text">{t.resetPassword.title}</h1>
      <p className="mb-8 text-sm text-text-dim">{t.resetPassword.subtitle}</p>

      <Card className="p-6">
        {!user ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-danger">{t.resetPassword.invalidLinkMsg}</p>
            <LinkButton href="/forgot-password" variant="primary">
              {t.resetPassword.requestNewLink}
            </LinkButton>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
                {decodeURIComponent(error)}
              </div>
            )}
            <form action={resetPasswordAction} className="flex flex-col gap-4">
              <Field label={t.resetPassword.newPasswordLabel}>
                <input
                  className={inputClass}
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </Field>
              <Button type="submit" variant="primary" className="mt-2 w-full">
                {t.resetPassword.submitBtn}
              </Button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}

