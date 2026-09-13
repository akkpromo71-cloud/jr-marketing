// Обёртка над существующим src/lib/tiktok.ts под общий интерфейс ViewStatsProvider —
// сама логика (скрейпинг __UNIVERSAL_DATA_FOR_REHYDRATION__, SSRF-фильтр по хосту)
// не дублируется, см. надёжность там же.
import { fetchTikTokStats } from '@/lib/tiktok';
import type { ViewStatsProvider } from './types';

export const tiktokProvider: ViewStatsProvider = (url) => fetchTikTokStats(url);
