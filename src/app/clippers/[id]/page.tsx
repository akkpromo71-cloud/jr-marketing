import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Container } from '@/components/layout';
import { ToolStat, ToolFigure } from '@/components/tool-ui';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';

interface ClipperPublicProfile {
  display_name: string;
  avatar_url: string | null;
  total_earned: number | null;
  avg_views: number | null;
  accept_rate: number | null;
  avg_submit_hours: number | null;
  completed_count: number;
  hide_earnings: boolean;
}

// Публичный профиль клиппера (дифференциатор №6) — доступен без входа.
// get_clipper_public_profile — security definer RPC (см.
// supabase/migrations/0007_public_clipper_profile.sql), само скрывает сумму
// заработка, если клиппер это включил в настройках.
export default async function ClipperPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getDict();
  const supabase = await createClient();

  const { data } = await supabase.rpc('get_clipper_public_profile', { p_clipper_id: id });
  const profile = (Array.isArray(data) ? data[0] : data) as ClipperPublicProfile | undefined;
  if (!profile) notFound();

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container width="text">
          <div className="flex items-center gap-4">
            <Avatar url={profile.avatar_url} name={profile.display_name} size={56} />
            <div>
              <p className="text-meta text-text-faint">{t.publicProfile.title}</p>
              <h1 className="text-headline text-text">{profile.display_name}</h1>
            </div>
          </div>

          <div className="mt-8 border-b border-border pb-6">
            <ToolStat
              value={profile.hide_earnings || profile.total_earned == null ? t.publicProfile.earningsHidden : `${profile.total_earned} $`}
              label={t.publicProfile.totalEarnedLabel}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <ToolFigure value={profile.avg_views != null ? Math.round(profile.avg_views) : '—'} label={t.publicProfile.avgViewsLabel} />
            <ToolFigure
              value={profile.accept_rate != null ? `${Math.round(profile.accept_rate * 100)}%` : '—'}
              label={t.publicProfile.acceptRateLabel}
            />
            <ToolFigure
              value={profile.avg_submit_hours != null ? `${Math.round(profile.avg_submit_hours)} ${t.publicProfile.avgSpeedHours}` : '—'}
              label={t.publicProfile.avgSpeedLabel}
            />
            <ToolFigure value={profile.completed_count} label={t.publicProfile.completedLabel} />
          </div>

          <a href="/campaigns" className="mt-10 inline-block text-sm text-accent hover:underline">
            {t.publicProfile.backToCampaigns}
          </a>
        </Container>
      </main>
    </>
  );
}
