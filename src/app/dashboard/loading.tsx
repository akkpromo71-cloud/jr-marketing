import { Container, Grid } from '@/components/layout';

// Скелетон под «пульт управления» кабинета артиста (src/app/dashboard/page.tsx):
// рельс кампаний слева, сводка справа. .skeleton — шиммер из globals.css.
export default function DashboardLoading() {
  return (
    <main className="py-12">
      <Container>
        <Grid>
          <div className="flex flex-col gap-3 md:col-span-4">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3 w-24 rounded-none" />
              <div className="skeleton h-8 w-28 rounded-full" />
            </div>
            <div className="border border-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border-l-2 border-l-accent py-3 pl-4 pr-3">
                  <div className="skeleton h-4 w-2/3 rounded-none" />
                  <div className="skeleton mt-2 h-3 w-1/3 rounded-none" />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="skeleton h-8 w-64 rounded-none" />
            <div className="skeleton mt-3 h-4 w-80 rounded-none" />
            <div className="mt-10 max-w-md">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center justify-between border-t border-border py-5">
                  <div className="skeleton h-3 w-32 rounded-none" />
                  <div className="skeleton h-10 w-24 rounded-none" />
                </div>
              ))}
            </div>
          </div>
        </Grid>
      </Container>
    </main>
  );
}
