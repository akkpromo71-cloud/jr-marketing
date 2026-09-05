import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Field, inputClass, Button, BackLink } from '@/components/ui';
import { createCampaignAction } from '@/app/dashboard/actions';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';

// Запасная средняя ставка, если одобренных эдиторов с указанной ценой ещё
// нет вообще (например, на самом старте площадки) — чтобы калькулятор ниже
// всегда показывал хоть какой-то разумный ориентир, а не $0.
const FALLBACK_AVG_PRICE = 40;

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'artist' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const { t } = await getDict();

  // Рекомендуемый бюджет — простая формула (не ML, данных пока недостаточно):
  // средняя ставка одобренных эдиторов × сколько эдиторов нужно, с запасом
  // сверху на разброс цен. Это ориентир, а не гарантия охвата — см.
  // t.dashboardNew.budgetHintDisclaimer и supabase/patch-followers-terms-metrics.sql.
  const supabase = await createClient();
  const { data: approvedPrices } = await supabase
    .from('profiles')
    .select('price_min')
    .eq('role', 'editor')
    .eq('editor_status', 'approved')
    .not('price_min', 'is', null);
  const prices = (approvedPrices ?? [])
    .map((p) => Number((p as { price_min: number | null }).price_min))
    .filter((p) => Number.isFinite(p) && p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : FALLBACK_AVG_PRICE;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-lg px-6 py-12">
        <BackLink href="/dashboard" label={t.common.back} />
        <h1 className="font-display text-3xl font-medium text-text">{t.dashboardNew.title}</h1>
        <p className="mt-1 text-sm text-text-dim">{t.dashboardNew.subtitle}</p>

        <Card className="mt-8 p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}
          <form id="new-campaign-form" action={createCampaignAction} className="flex flex-col gap-4">
            <Field label={t.dashboardNew.name}>
              <input className={inputClass} name="title" required placeholder={t.dashboardNew.namePlaceholder} />
            </Field>
            <Field label={t.dashboardNew.description}>
              <textarea
                className={inputClass}
                name="description"
                rows={4}
                required
                placeholder={t.dashboardNew.descriptionPlaceholder}
              />
            </Field>
            <Field label={t.dashboardNew.trackLink}>
              <input className={inputClass} name="track_url" placeholder="https://..." />
            </Field>
            <Field label={t.dashboardNew.spotifyLink}>
              <input className={inputClass} name="spotify_url" placeholder="https://open.spotify.com/..." />
            </Field>
            <Field label={t.dashboardNew.maxEditors}>
              <input id="max_editors" className={inputClass} type="number" name="max_editors" min={1} defaultValue={1} />
            </Field>
            <Field label={t.dashboardNew.budget}>
              <input id="budget" className={inputClass} type="number" name="budget" min={0} />
            </Field>

            {/* Калькулятор рекомендуемого бюджета — формула, не ML (данных о
                прошлых кампаниях пока недостаточно). Диапазон пересчитывается
                на лету при изменении числа эдиторов (см. <script> ниже),
                а при попытке отправить форму с бюджетом заметно ниже
                рекомендованного — показывает подтверждение через confirm(),
                не блокируя публикацию (это ориентир, а не жёсткое правило). */}
            <div className="-mt-2 rounded-xl border border-border bg-surface2/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                {t.dashboardNew.budgetHintTitle}: <span id="budget-hint-range" className="normal-case text-accent">—</span>
              </p>
              <p className="mt-1 text-xs text-text-faint">{t.dashboardNew.budgetHintDisclaimer}</p>
            </div>

            <label className="flex items-start gap-2 text-xs text-text-dim">
              <input type="checkbox" name="terms_accepted" value="1" required className="mt-0.5" />
              <span>
                {t.terms.campaignAgreePrefix}
                <Link href="/terms" target="_blank" className="text-accent hover:underline">
                  {t.terms.campaignAgreeLinkText}
                </Link>
                {t.terms.campaignAgreeSuffix}
              </span>
            </label>

            <Button type="submit" variant="primary" className="mt-2 w-full">
              {t.dashboardNew.publishBtn}
            </Button>
          </form>
        </Card>
      </main>

      <script
        // Чистый JS без React-состояния — намеренно (см. комментарий про
        // client/server-границу в src/components/ui.tsx): страница остаётся
        // серверным компонентом, а этот маленький скрипт только пересчитывает
        // подсказку и один раз спрашивает подтверждение при явно заниженном
        // бюджете. Похожий приём уже используется в src/app/layout.tsx для темы.
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var avgPrice = ${avgPrice};
              var maxEditorsInput = document.getElementById('max_editors');
              var budgetInput = document.getElementById('budget');
              var hintEl = document.getElementById('budget-hint-range');
              var form = document.getElementById('new-campaign-form');

              function computeRange() {
                var n = Math.max(1, parseInt((maxEditorsInput && maxEditorsInput.value) || '1', 10) || 1);
                var min = Math.round(avgPrice * n);
                var max = Math.round(avgPrice * n * 1.6);
                return { min: min, max: max };
              }

              function updateHint() {
                if (!hintEl) return;
                var r = computeRange();
                hintEl.textContent = '$' + r.min + '–$' + r.max;
              }

              if (maxEditorsInput) {
                updateHint();
                maxEditorsInput.addEventListener('input', updateHint);
              }

              if (form && budgetInput) {
                form.addEventListener('submit', function (e) {
                  var r = computeRange();
                  var budget = parseFloat(budgetInput.value);
                  if (budget && budget > 0 && budget < r.min) {
                    var msg = ${JSON.stringify(t.dashboardNew.budgetTooLowConfirm)}
                      .replace('{min}', String(r.min))
                      .replace('{max}', String(r.max));
                    if (!window.confirm(msg)) {
                      e.preventDefault();
                    }
                  }
                });
              }
            })();
          `,
        }}
      />
    </>
  );
}
