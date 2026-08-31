import { signUpArtistAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button, Card, BackLink } from '@/components/ui';
import { getDict } from '@/lib/i18n';

export default async function ArtistSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getDict();

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 py-16">
      <BackLink href="/" label={t.common.back} />
      <h1 className="mb-1 font-display text-3xl font-medium text-text">{t.signupArtist.title}</h1>
      <p className="mb-8 text-sm text-text-dim">{t.signupArtist.subtitle}</p>

      <Card className="p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
            {decodeURIComponent(error)}
          </div>
        )}
        <form action={signUpArtistAction} className="flex flex-col gap-4">
          <Field label={t.signupArtist.name}>
            <input className={inputClass} name="display_name" required placeholder={t.signupArtist.namePlaceholder} />
          </Field>
          <Field label={t.signupArtist.email}>
            <input className={inputClass} type="email" name="email" required />
          </Field>
          <Field label={t.signupArtist.password}>
            <input className={inputClass} type="password" name="password" required minLength={6} />
          </Field>
          <Field label={t.signupArtist.about}>
            <textarea
              className={inputClass}
              name="bio"
              rows={3}
              required
              minLength={10}
              placeholder={t.signupArtist.aboutPlaceholder}
            />
          </Field>
          <p className="text-xs text-text-faint -mt-2">{t.signupArtist.requiredNote}</p>
          <Button type="submit" variant="primary" className="mt-2 w-full">
            {t.signupArtist.submitBtn}
          </Button>
        </form>
      </Card>
    </main>
  );
}
