import { Container, Grid } from '@/components/layout';

// Скелетон под «режим доски» ленты (src/app/feed/page.tsx): meta-рельс слева,
// карточки разной высоты справа. .skeleton — шиммер из globals.css.
export default function FeedLoading() {
  return (
    <main className="py-12">
      <Container>
        <Grid>
          <div className="flex flex-col gap-6 md:col-span-3">
            <div>
              <div className="skeleton h-12 w-20 rounded-none" />
              <div className="skeleton mt-2 h-3 w-28 rounded-none" />
            </div>
            <div className="skeleton h-14 w-full rounded-none" />
          </div>

          <div className="md:col-span-9">
            <div className="skeleton h-8 w-56 rounded-none" />
            <div className="skeleton mt-3 h-4 w-80 rounded-none" />
            <div className="mt-8 flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`border border-border bg-surface p-6 ${i === 0 ? 'border-l-2 border-l-accent' : 'md:max-w-3xl'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="skeleton h-6 w-1/2 rounded-none" />
                      <div className="skeleton mt-2 h-3 w-1/3 rounded-none" />
                      <div className="skeleton mt-3 h-4 w-full rounded-none" />
                      <div className="skeleton mt-2 h-4 w-2/3 rounded-none" />
                    </div>
                    <div className="skeleton h-6 w-16 shrink-0 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Grid>
      </Container>
    </main>
  );
}
