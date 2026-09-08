import Link from 'next/link';
import { signUpArtistAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
import { getDict } from '@/lib/i18n';

export default async function ArtistSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getDict();

  return (
    <AuthShell
      title={t.signupArtist.title}
      subtitle={t.signupArtist.subtitle}
      brandLine={t.signupArtist.brandLine}
      backHref="/"
    >
      {error && (
        <div className="mb-6 rounded-none border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      )}
      <form action={signUpArtistAction} className="flex flex-col gap-5">
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
        <p className="-mt-2 text-xs text-text-faint">{t.signupArtist.requiredNote}</p>

        <label className="flex items-start gap-2 text-xs text-text-dim">
          <input type="checkbox" name="terms_accepted" value="1" required className="mt-0.5" />
          <span>
            {t.terms.agreePrefix}
            <Link href="/terms" target="_blank" className="text-accent hover:underline">
              {t.terms.agreeLinkText}
            </Link>
            {t.terms.agreeSuffix}
          </span>
        </label>

        <Button type="submit" variant="primary" className="mt-1 w-full">
          {t.signupArtist.submitBtn}
        </Button>
      </form>
    </AuthShell>
  );
}
