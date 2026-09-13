import { Container } from '@/components/layout';

// Скелетон под режим «инструмент» кабинета заказчика
// (src/app/dashboard/page.tsx): компактный заголовок + строки таблицы.
// .skeleton — шиммер из globals.css.
export default function DashboardLoading() {
  return (
    <main className="py-6 sm:py-8">
      <Container>
        <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="skeleton h-3 w-28 rounded-none" />
            <div className="skeleton mt-2 h-3 w-40 rounded-none" />
          </div>
          <div className="skeleton h-9 w-32 rounded" />
        </div>
        <div className="mt-6 flex flex-col gap-px border border-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-surface p-3">
              <div className="skeleton h-4 w-1/3 rounded-none" />
              <div className="skeleton h-4 w-16 rounded-none" />
              <div className="skeleton h-4 w-16 rounded-none" />
              <div className="skeleton ml-auto h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
