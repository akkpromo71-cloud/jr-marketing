import type { createClient } from '@/lib/supabase/server';

// import type стирается при сборке — рантайм-зависимости от next/headers тут нет,
// файл можно импортировать и со страницы, и из server action.
type Client = Awaited<ReturnType<typeof createClient>>;

// Кампанию можно править, пока она открыта и по ней НЕТ принятой заявки.
// Принятой считаем любую, которая ушла дальше 'pending'/'rejected' — то есть
// эдитор уже взялся за работу, и менять условия под ним нельзя. Одна точка
// истины для страницы (показать/скрыть кнопку) и для updateCampaignAction
// (не дать сохранить), чтобы проверка не разъехалась между ними.
export async function campaignIsEditable(
  supabase: Client,
  campaignId: string,
  status: string
): Promise<boolean> {
  if (status !== 'open') return false;

  const { count, error } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['accepted', 'in_revision', 'delivered', 'completed']);

  // Не смогли посчитать — считаем кампанию нередактируемой: безопаснее не
  // дать правку, чем дать её поверх уже работающего эдитора.
  if (error) return false;

  return (count ?? 0) === 0;
}
