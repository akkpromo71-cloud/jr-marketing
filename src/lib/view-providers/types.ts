import type { Platform } from '@/lib/types';

export interface ViewStats {
  views: number;
  likes: number;
}

export type ViewStatsProvider = (url: string) => Promise<ViewStats | null>;

export type ProviderMap = Record<Platform, ViewStatsProvider>;
