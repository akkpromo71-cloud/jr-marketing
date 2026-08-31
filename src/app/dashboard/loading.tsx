// Скелетон-заглушка под кабинет артиста (src/app/dashboard/page.tsx) — та же
// идея, что и у src/app/feed/loading.tsx: форма страницы угадывается ещё до
// того, как данные с сервера подъедут.
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="skeleton h-9 w-56 rounded-lg" />
          <div className="skeleton mt-3 h-4 w-72 rounded-lg" />
        </div>
        <div className="skeleton h-10 w-36 rounded-full" />
      </div>

      <div className="mt-10 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="skeleton h-6 w-1/2 rounded-lg" />
                <div className="skeleton mt-2 h-4 w-full rounded-lg" />
                <div className="skeleton mt-2 h-4 w-2/3 rounded-lg" />
              </div>
              <div className="skeleton h-6 w-16 shrink-0 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
