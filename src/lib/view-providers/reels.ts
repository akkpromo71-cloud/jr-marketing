// Instagram Reels — самый ненадёжный из трёх провайдеров, честно об этом
// говорим в отчёте, а не только в комментарии. Официального пути нет:
// Instagram Graph API отдаёт метрики только по видео на аккаунте, который сам
// подключил приложение (OAuth business-аккаунта) — для чужих роликов клипперов
// это неприменимо. Публичный oEmbed instagram.com/oembed сейчас тоже требует
// app-токен и не отдаёт числа просмотров/лайков даже с ним.
//
// Единственное, что остаётся — разбор HTML страницы поста (тот же приём, что
// и в src/lib/tiktok.ts). Instagram намного агрессивнее TikTok блокирует такие
// запросы: с серверных IP (в том числе Vercel) почти всегда отдаётся страница
// логина без данных о видео. На практике это означает, что автосбор для Reels
// будет часто возвращать null и полагаться придётся на ручной ввод админом —
// это НЕ баг, а ограничение платформы, для которого нет обходного пути без
// официального доступа.
import { logError } from '@/lib/log-error';
import type { ViewStatsProvider } from './types';

function isInstagramUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return /(^|\.)instagram\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

export const reelsProvider: ViewStatsProvider = async (url, timeoutMs = 8000) => {
  if (!isInstagramUrl(url)) return null;

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

    const viewsMatch =
      html.match(/"video_view_count":(\d+)/) ?? html.match(/"play_count":(\d+)/);
    if (!viewsMatch) return null;
    const views = Number(viewsMatch[1]);
    if (!Number.isFinite(views)) return null;

    const likesMatch = html.match(/"edge_media_preview_like":\{"count":(\d+)/);
    const likes = likesMatch ? Number(likesMatch[1]) : 0;

    return { views, likes: Number.isFinite(likes) ? likes : 0 };
  } catch (err) {
    logError('reelsProvider', err, { url });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
