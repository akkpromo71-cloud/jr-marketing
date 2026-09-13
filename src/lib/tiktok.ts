// Официального публичного API "дай статистику по чужой ссылке" у TikTok нет —
// цифры выдаются только по видео, которыми владеет сам вызывающий (через привязку
// аккаунта). Поэтому забираем те же цифры, что видит в браузере любой человек,
// открывший ссылку на видео: TikTok встраивает их в JSON внутри HTML страницы.
//
// Это неофициальный путь — если TikTok изменит вёрстку страницы или начнёт
// блокировать запросы с серверов Vercel, проверка перестанет находить цифры,
// пока это не поправят. При сбое функция просто возвращает null и старые
// сохранённые цифры не трогаются — сайт не падает и не затирает данные.
// Ошибку при этом логируем (см. logError ниже) — раньше сбой был виден,
// только если специально смотреть в код: молчаливый null неотличим от
// "TikTok просто пока не отдал цифры".

import { logError } from '@/lib/log-error';

export interface TikTokStats {
  views: number;
  likes: number;
}

// Ссылку сюда передаёт эдитор (posted_url) — без белого списка хостов сервер
// по его команде дёрнет любой адрес, включая внутренние (SSRF): облачные
// metadata-эндпоинты, localhost, соседние сервисы. Пускаем только домены
// TikTok (вкл. короткие vm./vt.).
function isTikTokUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return /(^|\.)tiktok\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

const REHYDRATION_SCRIPT_RE =
  /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;

export async function fetchTikTokStats(url: string, timeoutMs = 8000): Promise<TikTokStats | null> {
  if (!isTikTokUrl(url)) return null;

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
  } catch (err) {
    // Логируем только реальные сбои (сеть, парсинг JSON) — а не "TikTok пока
    // не отдал цифры по этой ссылке" (та ветка просто return null выше, без
    // исключения): иначе лог захлёбывался бы шумом на каждой обычной ссылке.
    logError('fetchTikTokStats', err, { url });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Использования звука (сколько видео смонтировано с этим треком) — метрика,
// специфичная для музыкальных кампаний (см. campaigns.track_sound_url).
//
// ЧЕСТНО: этот путь НЕ проверен вживую (у среды разработки нет доступа
// сделать реальный запрос к tiktok.com и посмотреть фактическую разметку
// страницы звука). Структура ниже — та же техника, что и в fetchTikTokStats
// (тот же __UNIVERSAL_DATA_FOR_REHYDRATION__), с ключом 'webapp.music-detail'
// по описаниям структуры TikTok в открытых источниках. Если TikTok использует
// другой ключ/путь — функция просто будет возвращать null, ничего не сломает
// (то же поведение "тихого отказа", что и у остальных провайдеров), но
// потребует один правкой поправить путь после реальной проверки на проде.
export async function fetchTikTokSoundVideoCount(url: string, timeoutMs = 8000): Promise<number | null> {
  if (!isTikTokUrl(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
      headers: {
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
    const musicInfo = data?.__DEFAULT_SCOPE__?.['webapp.music-detail']?.musicInfo;
    const count = musicInfo?.stats?.videoCount;
    const videoCount = Number(count);
    if (!Number.isFinite(videoCount)) return null;

    return videoCount;
  } catch (err) {
    logError('fetchTikTokSoundVideoCount', err, { url });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
