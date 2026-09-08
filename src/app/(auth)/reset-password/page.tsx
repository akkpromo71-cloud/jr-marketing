import { resetPasswordAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button, LinkButton } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
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
  // ссылке из письма (обмен code -> session). Если сессии нет — ссылка либо
  // устарела, либо страницу открыли напрямую без перехода по письму.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell
      title={t.resetPassword.title}
      subtitle={t.resetPassword.subtitle}
      brandLine={t.resetPassword.title}
      backHref="/login"
    >
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
            <div className="mb-6 rounded-none border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={resetPasswordAction} className="flex flex-col gap-5">
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
            <Button type="submit" variant="primary" className="mt-1 w-full">
              {t.resetPassword.submitBtn}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
