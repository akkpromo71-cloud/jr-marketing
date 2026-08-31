// Скелетон-заглушка вместо общего спиннера — специально под форму ленты
// треков (src/app/feed/page.tsx), чтобы переход на страницу ощущался как
// "контент вот-вот появится", а не как голая загрузка. .skeleton объявлен
// в globals.css (шиммер-анимация, уважает prefers-reduced-motion).
export default function FeedLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="skeleton h-9 w-56 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-80 rounded-lg" />

      <div className="mt-8 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="skeleton h-6 w-2/3 rounded-lg" />
                <div className="skeleton mt-2 h-3 w-1/3 rounded-lg" />
                <div className="skeleton mt-3 h-4 w-full rounded-lg" />
                <div className="skeleton mt-2 h-4 w-5/6 rounded-lg" />
              </div>
              <div className="skeleton h-6 w-16 shrink-0 rounded-full" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="skeleton h-7 w-24 rounded-full" />
              <div className="skeleton h-7 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
