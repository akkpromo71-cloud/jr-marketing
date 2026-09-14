// Общие типы данных приложения. Соответствуют таблицам из supabase/schema.sql

export type Role = 'artist' | 'editor' | 'admin';

export type EditorStatus = 'pending' | 'approved' | 'rejected';

export type CampaignStatus =
  | 'open' | 'in_progress' | 'completed' | 'closed' // старый музыкальный флоу
  | 'draft' | 'funded' | 'active' | 'paused' | 'finished'; // клиппинг

export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_revision'
  | 'delivered'
  | 'completed';

export interface Profile {
  id: string;
  role: Role;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  editor_status: EditorStatus | null;
  price_min: number | null;
  price_max: number | null;
  active_cap: number | null;
  telegram: string | null;
  instagram: string | null;
  tiktok: string | null;
  portfolio_url: string | null;
  // Куда эдитору присылать оплату — заполняется при регистрации, можно
  // изменить в /settings. Хотя бы одно из двух обязательно для эдитора.
  paypal_email: string | null;
  crypto_wallet: string | null;
  // Подписчики — само-заявленное число, как и соцсети выше (не проверяется
  // автоматически), помогает админу оценить охват эдитора при выборе на заявку.
  followers: number | null;
  // Когда пользователь принял условия использования при регистрации.
  terms_accepted_at: string | null;
  // Скрыть сумму заработка на публичном профиле клиппера (остальные метрики
  // всегда видны) — supabase/migrations/0007_public_clipper_profile.sql.
  hide_earnings: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  artist_id: string;
  title: string;
  description: string;
  track_url: string | null;
  // Ссылка на трек в Spotify — необязательное дополнение к track_url
  // (обычно ссылке на звук в TikTok), показывается отдельной кнопкой в ленте.
  spotify_url: string | null;
  // Заметка от администратора для эдиторов по этой кампании (например,
  // пожелания по стилю монтажа) — заполняется на странице кампании в админке.
  manager_message: string | null;
  budget: number | null;
  status: CampaignStatus;
  max_editors: number;
  // Бриф для эдитора (supabase/patch-campaign-brief-fields.sql). Все поля
  // NULLable — старые кампании открываются без них; обязательность deadline /
  // track_title_for_caption / budget обеспечивают форма и серверный экшен.
  deadline: string | null;
  track_title_for_caption: string | null;
  artist_handle: string | null;
  track_segment: string | null;
  reference_urls: string[] | null;
  restrictions: string | null;
  // Когда артист принял условия кампании (права на трек, охват — не
  // гарантия) при публикации трека — отдельно от согласия при регистрации.
  terms_accepted_at: string | null;
  created_at: string;
  // Клиппинг-поля (supabase/migrations/0003_clipping_platform.sql) —
  // заполнены у новых кампаний, null/0 у старых музыкальных.
  cpm_rate: number | null;
  client_cpm: number | null;
  budget_total: number;
  budget_reserved: number;
  budget_spent: number;
  per_clip_cap: number | null;
  max_clips_per_clipper: number | null;
  platforms: Platform[];
  rules: string | null;
  required_caption: string | null;
  source_urls: string[];
  slot_ttl_hours: number;
  track_sound_url: string | null;
}

export interface Application {
  id: string;
  campaign_id: string;
  editor_id: string;
  status: ApplicationStatus;
  price: number | null;
  cover_note: string | null;
  // Устаревшее поле: до появления черновиков эдитор сдавал сюда сразу готовый
  // ролик. Оставлено, чтобы старые заявки открывались как раньше.
  submission_url: string | null;
  // Черновик на приёмку — сдаётся ДО публикации (supabase/patch-draft-flow.sql).
  draft_url: string | null;
  // Результат промо-эдита: эдитор заливает эдит на СВОЙ аккаунт (не артиста),
  // и сам же вносит сюда ссылку — только у него есть доступ к статистике поста.
  posted_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  result_updated_at: string | null;
  // Ежесуточная проверка, что опубликованный пост ещё существует
  // (src/app/api/cron/post-liveness/route.ts).
  post_checked_at: string | null;
  post_missing: boolean;
  created_at: string;
  updated_at: string;
}

export interface RevisionMessage {
  id: string;
  application_id: string;
  author_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
}

// =========================================================
// Клиппинг-платформа (supabase/migrations/0003_clipping_platform.sql).
// Роли в БД не переименованы: role='artist' — клиент, role='editor' — клиппер.
// Кампании клиппинга — те же строки таблицы campaigns, но со status в новом
// наборе значений и заполненными cpm_rate/budget_total/per_clip_cap и т.д.
// =========================================================

export type ClippingCampaignStatus = 'draft' | 'funded' | 'active' | 'paused' | 'finished';

export type Platform = 'tiktok' | 'reels' | 'shorts';

export type SlotStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface Slot {
  id: string;
  campaign_id: string;
  clipper_id: string;
  amount_reserved: number;
  expires_at: string;
  status: SlotStatus;
  created_at: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'removed';

export type RejectReasonCode = 'low_quality' | 'wrong_caption' | 'fake_views' | 'duplicate' | 'off_brief' | 'other';

export interface Submission {
  id: string;
  campaign_id: string;
  clipper_id: string;
  slot_id: string;
  url: string;
  platform: Platform;
  posted_at: string | null;
  status: SubmissionStatus;
  reject_reason_code: RejectReasonCode | null;
  reject_reason_comment: string | null;
  views_total: number;
  views_paid: number;
  earned: number;
  capped: boolean;
  flagged: boolean;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViewSnapshot {
  id: string;
  submission_id: string;
  checked_at: string;
  views: number;
  likes: number;
  source: 'auto' | 'manual';
  created_by: string | null;
  created_at: string;
}

export interface Earning {
  id: string;
  submission_id: string;
  snapshot_id: string;
  amount: number;
  created_at: string;
}

export interface Wallet {
  clipper_id: string;
  balance: number;
  updated_at: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type PayoutMethod = 'paypal' | 'crypto';

export interface Withdrawal {
  id: string;
  clipper_id: string;
  amount: number;
  method: PayoutMethod;
  details: string;
  status: WithdrawalStatus;
  admin_comment: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface SoundUsageSnapshot {
  id: string;
  campaign_id: string;
  checked_at: string;
  videos_count: number;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected';

export interface ClientDeposit {
  id: string;
  campaign_id: string;
  client_id: string;
  amount: number;
  status: DepositStatus;
  admin_comment: string | null;
  created_at: string;
  decided_at: string | null;
}
