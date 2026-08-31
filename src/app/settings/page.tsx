import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Field, inputClass, Button, BackLink } from '@/components/ui';
import { Toast } from '@/components/toast';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { updatePayoutAction } from '@/app/settings/actions';
import { getDict } from '@/lib/i18n';

// Пока единственное, что тут можно поменять — реквизиты выплаты эдитора.
// Другим ролям (артист/админ) здесь сейчас нечего делать, поэтому страница
// доступна только эдитору — так же, как /feed и /applications.
export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'editor') redirect(roleHome(profile.role));

  const { t } = await getDict();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-lg px-6 py-12">
        <BackLink href="/feed" label={t.common.back} />
        <h1 className="font-display text-3xl font-medium text-text">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-text-dim">{t.settings.subtitle}</p>

        <Toast successParam="saved" successMessage={t.settings.savedMsg} errorParam="error" />
        <Card className="mt-8 p-6">
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
      </main>
    </>
  );
}
