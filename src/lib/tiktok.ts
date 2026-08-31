// Официального публичного API "дай статистику по чужой ссылке" у TikTok нет —
// цифры выдаются только по видео, которыми владеет сам вызывающий (через привязку
// аккаунта). Поэтому забираем те же цифры, что видит в браузере любой человек,
// открывший ссылку на видео: TikTok встраивает их в JSON внутри HTML страницы.
//
// Это неофициальный путь — если TikTok изменит вёрстку страницы или начнёт
// блокировать запросы с серверов Vercel, проверка перестанет находить цифры,
// пока это не поправят. При сбое функция просто возвращает null и старые
// сохранённые цифры не трогаются — сайт не падает и не затирает данные.

export interface TikTokStats {
  views: number;
  likes: number;
}

const REHYDRATION_SCRIPT_RE =
  /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;

export async function fetchTikTokStats(url: string, timeoutMs = 8000): Promise<TikTokStats | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        // Обычный браузерный User-Agent — без него TikTok часто отдаёт урезанную
        // страницу без данных о видео.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(REHYDRATION_SCRIPT_RE);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    const itemStruct =
      data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    const stats = itemStruct?.stats ?? itemStruct?.statsV2;
    if (!stats) return null;

    const views = Number(stats.playCount ?? 0);
    const likes = Number(stats.diggCount ?? 0);
    if (!Number.isFinite(views) || !Number.isFinite(likes)) return null;
    if (views === 0 && likes === 0) return null;

    return { views, likes };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
