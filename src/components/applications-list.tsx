'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Row = { id: string; title: string; status: string; price: number | null };

// Цветная засечка статуса слева — очередь заявок «сканируется» взглядом.
function tick(status: string) {
  if (status === 'accepted' || status === 'completed' || status === 'approved' || status === 'delivered')
    return 'border-l-success';
  if (status === 'rejected') return 'border-l-danger';
  if (status === 'pending' || status === 'in_revision') return 'border-l-warning';
  return 'border-l-accent';
}

// Список-очередь заявок эдитора для split-pane (REDESIGN_PLAN.md §5.4).
// Клиентский: usePathname подсвечивает активную строку и прячет список на
// мобиле, когда открыта деталь (там деталь на весь экран).
export function ApplicationsList({
  rows,
  labels,
}: {
  rows: Row[];
  labels: { queue: string; empty: string; price: string; statuses: Record<string, string> };
}) {
  const pathname = usePathname();
  const onDetail = pathname !== '/applications';

  return (
    <div className={`flex-col ${onDetail ? 'hidden md:flex' : 'flex'}`}>
      <p className="mb-3 text-meta text-text-faint">
        {labels.queue} ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-text-faint">{labels.empty}</p>
      ) : (
        <div className="border border-border">
          {rows.map((r) => {
            const active = pathname === `/applications/${r.id}`;
            return (
              <Link
                key={r.id}
                href={`/applications/${r.id}`}
                className={`block border-l-2 ${tick(r.status)} py-3 pl-4 pr-3 transition ${
                  active ? 'bg-surface2/30' : 'bg-surface hover:bg-surface2/20'
                }`}
              >
                <span className="block truncate text-sm text-text">{r.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-micro uppercase text-text-faint">
                  <span>{labels.statuses[r.status] ?? r.status}</span>
                  {r.price != null && (
                    <span>
                      · {labels.price}: {r.price} $
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
