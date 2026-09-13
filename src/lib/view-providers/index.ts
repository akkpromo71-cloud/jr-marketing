import type { Platform } from '@/lib/types';
import type { ProviderMap } from './types';
import { tiktokProvider } from './tiktok';
import { reelsProvider } from './reels';
import { shortsProvider } from './shorts';

const providers: ProviderMap = {
  tiktok: tiktokProvider,
  reels: reelsProvider,
  shorts: shortsProvider,
};

export function getViewStatsProvider(platform: Platform) {
  return providers[platform];
}

export type { ViewStats } from './types';
