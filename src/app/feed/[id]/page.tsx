import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Button, Field, inputClass, BackLink } from '@/components/ui';
import { Music2 } from 'lucide-react';
import { Container } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { takeSlotAction, submitClipAction } from '@/app/feed/actions';
import { getDict } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import type { Campaign, Slot, Submission } from '@/lib/types';

export default async function FeedCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; slot?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();
  const c = campaign as Campaign & { id: string };

  // Независимые запросы — параллельно, а не по очереди (3 круговых обращения
  // к Supabase вместо 1 круга ожидания).
  const [{ data: client }, { data: mySlot }, { data: mySubmissions }] = await Promise.all([
    supabase.from('profiles_public').select('display_name, avatar_url').eq('id', c.artist_id).maybeSingle(),
    profile
      ? supabase
          .from('slots')
          .select('*')
          .eq('campaign_id', id)
          .eq('clipper_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .maybeSingle()
      : Promise.resolve({ data: null }),
    profile
      ? supabase
          .from('submissions')
          .select('*')
          .eq('campaign_id', id)
          .eq('clipper_id', profile.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';
  // Клиппер может брать несколько слотов подряд на одну кампанию (до
  // max_clips_per_clipper) — реальный лимит проверяет и обеспечивает take_slot
  // (см. supabase/migrations/0004_clipping_functions.sql), тут только UI:
  // кнопка скрыта, пока текущий слот не сдан, чтобы не плодить незакрытые резервы.
  const canTakeSlot =
    profile?.role === 'editor' && !pending && !rejected && ['funded', 'active'].includes(c.status) && !mySlot;

  const available = Math.max(c.budget_total - c.budget_reserved - c.budget_spent, 0);

  return (
    <>
      <Nav />
      <main className="py-6 sm:py-8">
        <Container width="text">
          <BackLink href="/feed" label={t.common.back} />

          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Avatar url={client?.avatar_url ?? null} name={client?.display_name ?? '?'} size={40} />
              <div>
                <h1 className="text-lg font-semibold text-text">{c.title}</h1>
                {client?.display_name && (
                  <p className="mt-1 text-sm text-text-faint">
                    {t.clip.clientLabel}: {client.display_name}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={c.status} />
          </div>

          {error && (
            <div className="mt-6 rounded-[4px] border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}

          <p className="mt-6 whitespace-pre-line text-body text-text-dim">{c.description}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {c.cpm_rate != null && (
              <p>
                <span className="font-mono text-lg tabular-nums text-text">{c.cpm_rate} $</span>{' '}
                <span className="text-micro uppercase text-text-faint">{t.clip.cpmLabel}</span>
              </p>
            )}
            {c.per_clip_cap != null && (
              <p className="text-sm text-text-faint">
                {t.clip.capLabel}: <span className="font-mono tabular-nums text-text-dim">{c.per_clip_cap} $</span>
              </p>
            )}
            <p className="text-sm text-text-faint">
              {t.clip.budgetLeftLabel}: <span className="font-mono tabular-nums text-text-dim">{available} $</span>
            </p>
          </div>

          {c.platforms?.length > 0 && (
            <p className="mt-2 text-sm text-text-faint">
              {t.clip.platformsLabel}: {c.platforms.join(', ')}
            </p>
          )}

          {c.track_sound_url && (
            <div className="mt-4">
              <a
                href={c.track_sound_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2/40 px-3 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
              >
                <Music2 size={14} strokeWidth={1.75} aria-hidden="true" /> {t.clip.soundLabel}
              </a>
            </div>
          )}

          {(c.source_urls?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="text-meta text-text-faint">{t.clip.materialsLabel}</p>
              <div className="mt-1 flex flex-col gap-1">
                {c.source_urls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-accent hover:underline">
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {c.required_caption && (
            <div className="mt-4 border border-[var(--accent-tint-border)] bg-[var(--accent-tint-bg)] px-4 py-3">
              <p className="text-meta text-accent">{t.clip.requiredCaptionLabel}</p>
              <p className="mt-1 text-sm text-text-dim">{c.required_caption}</p>
            </div>
          )}

          {c.rules && (
            <dl className="mt-4 flex flex-col gap-2 rounded-[4px] border border-border p-4 text-sm">
              <dt className="text-meta text-text-faint">{t.clip.rulesLabel}</dt>
              <dd className="whitespace-pre-line text-text-dim">{c.rules}</dd>
            </dl>
          )}

          {(mySubmissions?.length ?? 0) > 0 && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="text-sm text-text-faint">
                {(mySubmissions as Submission[]).length} — {t.clip.mySubmissionsTitle.toLowerCase()}.{' '}
                <a href="/applications" className="text-accent hover:underline">
                  {t.clip.myWorkTitle}
                </a>
              </p>
            </div>
          )}

          {mySlot ? (
            <form action={submitClipAction} className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              <input type="hidden" name="slot_id" value={(mySlot as Slot).id} />
              <input type="hidden" name="campaign_id" value={c.id} />
              <p className="text-sm text-warning">
                {t.clip.slotExpiresLabel}:{' '}
                <span className="font-mono tabular-nums">{formatDateTime((mySlot as Slot).expires_at, locale)}</span>
              </p>
              <p className="text-sm font-semibold text-text">{t.clip.submitClipTitle}</p>
              <p className="text-sm text-text-faint">{t.clip.submitClipHint}</p>
              <Field label={t.clip.urlLabel}>
                <input className={inputClass} name="url" type="url" required placeholder="https://" />
              </Field>
              <Field label={t.clip.platformLabel}>
                <select className={inputClass} name="platform" required defaultValue={c.platforms?.[0] ?? 'tiktok'}>
                  {(c.platforms?.length ? c.platforms : ['tiktok', 'reels', 'shorts']).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" variant="primary" className="self-start">
                {t.clip.submitClipBtn}
              </Button>
            </form>
          ) : canTakeSlot ? (
            <form action={takeSlotAction} className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              <input type="hidden" name="campaign_id" value={c.id} />
              <p className="text-xs text-text-faint">
                {t.clip.takeSlotHint
                  .replace('{amount}', String(c.per_clip_cap ?? '—'))
                  .replace('{hours}', String(c.slot_ttl_hours))}
              </p>
              <Button type="submit" variant="primary" className="self-start">
                {t.clip.takeSlotBtn}
              </Button>
            </form>
          ) : null}
        </Container>
      </main>
    </>
  );
}
