// Общие типы данных приложения. Соответствуют таблицам из supabase/schema.sql

export type Role = 'artist' | 'editor' | 'admin';

export type EditorStatus = 'pending' | 'approved' | 'rejected';

export type CampaignStatus = 'open' | 'in_progress' | 'completed' | 'closed';

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
  created_at: string;
}

export interface Application {
  id: string;
  campaign_id: string;
  editor_id: string;
  status: ApplicationStatus;
  price: number | null;
  cover_note: string | null;
  submission_url: string | null;
  // Результат промо-эдита: эдитор заливает эдит на СВОЙ аккаунт (не артиста),
  // и сам же вносит сюда ссылку и цифры — только у него есть доступ к статистике поста.
  posted_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  result_updated_at: string | null;
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
