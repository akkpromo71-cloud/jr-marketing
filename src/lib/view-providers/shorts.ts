// YouTube Shorts. В отличие от TikTok/Reels здесь ЕСТЬ официальный публичный
// API (YouTube Data API v3, videos.statistics) — просмотры и лайки любого
// публичного видео можно получить по одному ключу без привязки к аккаунту
// автора. Это самый надёжный из трёх провайдеров.
//
// Без ключа (переменная YOUTUBE_API_KEY не задана) используем фолбэк —
// разбор ytInitialPlayerResponse на странице ролика, тем же способом, что и
// TikTok-провайдер: если YouTube поменяет вёрстку, фолбэк перестанет находить
// цифры, но официальный путь с ключом это не затронет.
import { logError } from '@/lib/log-error';
import type { ViewStatsProvider } from './types';

function isYouTubeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return /(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === 'youtu.be';
  } catch {
    return false;
  }
}

function extractVideoId(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    const shortsMatch = u.pathname.match(/\/shorts\/([\w-]{6,})/);
    if (shortsMatch) return shortsMatch[1];
    return u.searchParams.get('v');
  } catch {
    return null;
  }
}

async function fetchViaApi(videoId: string, apiKey: string): Promise<import('./types').ViewStats | null> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const stats = data?.items?.[0]?.statistics;
  if (!stats) return null;
  const views = Number(stats.viewCount ?? 0);
  const likes = Number(stats.likeCount ?? 0);
  if (!Number.isFinite(views)) return null;
  return { views, likes: Number.isFinite(likes) ? likes : 0 };
}

async function fetchViaScrape(url: string, timeoutMs: number): Promise<import('./types').ViewStats | null> {
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
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const viewsMatch = html.match(/"viewCount":"(\d+)"/);
    if (!viewsMatch) return null;
    const views = Number(viewsMatch[1]);
    if (!Number.isFinite(views)) return null;

    // Лайки в разметке страницы найти надёжно нельзя (кнопка лайка рендерится
    // из динамического JSON без стабильного пути) — 0 не искажает деньги:
    // выплата считается по просмотрам, лайки только для отчёта.
    return { views, likes: 0 };
  } catch (err) {
    logError('shortsProvider:scrape', err, { url });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const shortsProvider: ViewStatsProvider = async (url, timeoutMs = 8000) => {
  if (!isYouTubeUrl(url)) return null;
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const viaApi = await fetchViaApi(videoId, apiKey);
      if (viaApi) return viaApi;
    } catch (err) {
      logError('shortsProvider:api', err, { url });
    }
  }

  return fetchViaScrape(url, timeoutMs);
};
