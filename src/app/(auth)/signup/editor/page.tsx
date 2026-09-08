import Link from 'next/link';
import { signUpEditorAction } from '@/app/(auth)/actions';
import { Field, inputClass, Button } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
import { getDict } from '@/lib/i18n';

export default async function EditorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getDict();

  return (
    <AuthShell
      title={t.signupEditor.title}
      subtitle={t.signupEditor.subtitle}
      brandLine={t.signupEditor.brandLine}
      backHref="/"
    >
      {error && (
        <div className="mb-6 rounded-none border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      )}
      <form action={signUpEditorAction} className="flex flex-col gap-5">
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
        <p className="-mt-3 text-xs text-text-faint">{t.signupEditor.priceHint}</p>
        <Field label={t.signupEditor.followers}>
          <input className={inputClass} type="number" name="followers" min={0} placeholder={t.signupEditor.followersPlaceholder} />
        </Field>
        <p className="-mt-3 text-xs text-text-faint">{t.signupEditor.followersHint}</p>
        <Field label={t.signupEditor.instagram}>
          <input className={inputClass} name="instagram" placeholder={t.signupEditor.instagramPlaceholder} />
        </Field>
        <Field label={t.signupEditor.tiktok}>
          <input className={inputClass} name="tiktok" placeholder={t.signupEditor.tiktokPlaceholder} />
        </Field>
        <Field label={t.signupEditor.telegram}>
          <input className={inputClass} name="telegram" placeholder={t.signupEditor.telegramPlaceholder} />
        </Field>
        <p className="-mt-3 text-xs text-text-faint">{t.signupEditor.socialHint}</p>

        {/* Реквизиты выплаты — без них некуда присылать оплату за эдиты,
            поэтому хотя бы одно из двух обязательно (проверка в signUpEditorAction). */}
        <div className="mt-2 border-t border-border pt-6">
          <p className="mb-4 text-meta text-text-faint">{t.payout.title}</p>
          <div className="flex flex-col gap-5">
            <Field label={t.payout.paypal}>
              <input className={inputClass} name="paypal_email" placeholder={t.payout.paypalPlaceholder} />
            </Field>
            <Field label={t.payout.crypto}>
              <input className={inputClass} name="crypto_wallet" placeholder={t.payout.cryptoPlaceholder} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-text-faint">{t.payout.hint}</p>
        </div>

        <p className="text-xs text-text-faint">{t.signupEditor.requiredNote}</p>

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
          {t.signupEditor.submitBtn}
        </Button>
      </form>
    </AuthShell>
  );
}
