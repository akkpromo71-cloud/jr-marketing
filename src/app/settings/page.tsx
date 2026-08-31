import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Field, inputClass, Button, BackLink } from '@/components/ui';
import { Avatar } from '@/components/avatar';
import { Toast } from '@/components/toast';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { updatePayoutAction, updateProfileAction } from '@/app/settings/actions';
import { getDict } from '@/lib/i18n';

// Профиль (имя, фото, "о себе") доступен и артисту, и эдитору — оба сами
// управляют тем, как выглядят на сайте. Реквизиты выплаты — секция ниже —
// по-прежнему только для эдитора (единственная роль, которой сюда платят).
export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'editor' && profile.role !== 'artist') redirect(roleHome(profile.role));

  const { t } = await getDict();
  const backHref = profile.role === 'editor' ? '/feed' : '/dashboard';

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-lg px-6 py-12">
        <BackLink href={backHref} label={t.common.back} />
        <h1 className="font-display text-3xl font-medium text-text">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-text-dim">{t.settings.subtitle}</p>

        <Toast successParam="saved" successMessage={t.settings.savedMsg} errorParam="error" />

        <Card className="mt-8 p-6">
          <form action={updateProfileAction} className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t.settings.profileTitle}
            </p>
            <div className="flex items-center gap-4">
              <Avatar url={profile.avatar_url} name={profile.display_name} size={56} />
              <Field label={t.settings.avatarLabel}>
                <input
                  className={`${inputClass} file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-xs file:font-semibold file:text-on-accent file:transition hover:file:brightness-105`}
                  type="file"
                  name="avatar"
                  accept="image/png,image/jpeg,image/webp"
                />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-text-faint">{t.settings.avatarHint}</p>
            <Field label={t.settings.nameLabel}>
              <input
                className={inputClass}
                name="display_name"
                defaultValue={profile.display_name}
                placeholder={t.settings.namePlaceholder}
                required
              />
            </Field>
            <Field label={t.settings.bioLabel}>
              <textarea
                className={inputClass}
                name="bio"
                rows={3}
                defaultValue={profile.bio ?? ''}
                placeholder={t.settings.bioPlaceholder}
              />
            </Field>
            <Button type="submit" variant="primary" className="mt-2 w-full">
              {t.settings.saveProfileBtn}
            </Button>
          </form>
        </Card>

        {profile.role === 'editor' && (
          <Card className="mt-6 p-6">
            <form action={updatePayoutAction} className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">{t.payout.title}</p>
              <Field label={t.payout.paypal}>
                <input
                  className={inputClass}
                  name="paypal_email"
                  defaultValue={profile.paypal_email ?? ''}
                  placeholder={t.payout.paypalPlaceholder}
                />
              </Field>
              <Field label={t.payout.crypto}>
                <input
                  className={inputClass}
                  name="crypto_wallet"
                  defaultValue={profile.crypto_wallet ?? ''}
                  placeholder={t.payout.cryptoPlaceholder}
                />
              </Field>
              <p className="-mt-2 text-xs text-text-faint">{t.payout.hint}</p>
              <Button type="submit" variant="primary" className="mt-2 w-full">
                {t.settings.saveBtn}
              </Button>
            </form>
          </Card>
        )}
      </main>
    </>
  );
}
