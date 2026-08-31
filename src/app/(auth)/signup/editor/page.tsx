import { signUpEditorAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button, Card, BackLink } from '@/components/ui';
import { getDict } from '@/lib/i18n';

export default async function EditorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getDict();

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 py-16">
      <BackLink href="/" label={t.common.back} />
      <h1 className="mb-1 font-display text-3xl font-medium text-text">{t.signupEditor.title}</h1>
      <p className="mb-8 text-sm text-text-dim">{t.signupEditor.subtitle}</p>

      <Card className="p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
            {decodeURIComponent(error)}
          </div>
        )}
        <form action={signUpEditorAction} className="flex flex-col gap-4">
          <Field label={t.signupEditor.name}>
            <input className={inputClass} name="display_name" required placeholder={t.signupEditor.namePlaceholder} />
          </Field>
          <Field label={t.signupEditor.email}>
            <input className={inputClass} type="email" name="email" required />
          </Field>
          <Field label={t.signupEditor.password}>
            <input className={inputClass} type="password" name="password" required minLength={6} />
          </Field>
          <Field label={t.signupEditor.about}>
            <textarea
              className={inputClass}
              name="bio"
              rows={3}
              required
              minLength={10}
              placeholder={t.signupEditor.aboutPlaceholder}
            />
          </Field>
          <Field label={t.signupEditor.price}>
            <input className={inputClass} type="number" name="price" min={1} required placeholder="50" />
          </Field>
          <p className="text-xs text-text-faint -mt-2">{t.signupEditor.priceHint}</p>
          <Field label={t.signupEditor.instagram}>
            <input className={inputClass} name="instagram" placeholder={t.signupEditor.instagramPlaceholder} />
          </Field>
          <Field label={t.signupEditor.tiktok}>
            <input className={inputClass} name="tiktok" placeholder={t.signupEditor.tiktokPlaceholder} />
          </Field>
          <Field label={t.signupEditor.telegram}>
            <input className={inputClass} name="telegram" placeholder={t.signupEditor.telegramPlaceholder} />
          </Field>
          <p className="text-xs text-text-faint -mt-2">{t.signupEditor.socialHint}</p>
          <p className="text-xs text-text-faint -mt-2">{t.signupEditor.requiredNote}</p>
          <Button type="submit" variant="primary" className="mt-2 w-full">
            {t.signupEditor.submitBtn}
          </Button>
        </form>
      </Card>
    </main>
  );
}
