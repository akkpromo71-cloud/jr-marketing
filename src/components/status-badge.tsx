import type {
  ApplicationStatus,
  CampaignStatus,
  DepositStatus,
  EditorStatus,
  SlotStatus,
  SubmissionStatus,
  WithdrawalStatus,
} from '@/lib/types';
import { getDict } from '@/lib/i18n';

// Вынесен из ui.tsx отдельно: getDict() читает cookie через next/headers, а
// это серверный API. Импортировать его можно только из серверных страниц —
// не из ui.tsx, который подключают и клиентские компоненты (см. src/app/error.tsx).

const statusStyles: Record<string, string> = {
  open: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  in_progress: 'text-accent bg-[var(--accent-tint-bg)] border-[var(--accent-tint-border)]',
  completed: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  closed: 'text-text-faint bg-surface2 border-border',
  pending: 'text-warning bg-[var(--warning-tint-bg)] border-[var(--warning-tint-border)]',
  accepted: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  rejected: 'text-danger bg-[var(--danger-tint-bg)] border-[var(--danger-tint-border)]',
  in_revision: 'text-warning bg-[var(--warning-tint-bg)] border-[var(--warning-tint-border)]',
  delivered: 'text-accent bg-[var(--accent-tint-bg)] border-[var(--accent-tint-border)]',
  approved: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  // ── Клиппинг ──
  draft: 'text-text-faint bg-surface2 border-border',
  funded: 'text-accent bg-[var(--accent-tint-bg)] border-[var(--accent-tint-border)]',
  active: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  paused: 'text-warning bg-[var(--warning-tint-bg)] border-[var(--warning-tint-border)]',
  finished: 'text-text-faint bg-surface2 border-border',
  used: 'text-accent bg-[var(--accent-tint-bg)] border-[var(--accent-tint-border)]',
  expired: 'text-text-faint bg-surface2 border-border',
  cancelled: 'text-text-faint bg-surface2 border-border',
  removed: 'text-danger bg-[var(--danger-tint-bg)] border-[var(--danger-tint-border)]',
  paid: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
};

// Подписи статусов берутся из словаря i18n (src/lib/i18n.ts) — StatusBadge сам
// определяет текущий язык по cookie, поэтому вызывающему коду ничего передавать не нужно.
export async function StatusBadge({
  status,
}: {
  status:
    | CampaignStatus
    | ApplicationStatus
    | EditorStatus
    | SlotStatus
    | SubmissionStatus
    | WithdrawalStatus
    | DepositStatus;
}) {
  const { t } = await getDict();
  const statusLabels: Record<string, string> = t.status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] ?? 'text-text-faint bg-surface2 border-border'
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

