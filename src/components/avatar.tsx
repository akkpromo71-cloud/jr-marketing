// Простой компонент аватара: если в профиле есть картинка — показываем её,
// иначе — кружок с первой буквой имени (чтобы в списках/ленте не было "дыр"
// там, где аватар ещё не загружен). Обычный <img>, а не next/image — URL
// приходит из Supabase Storage конкретного проекта, домен заранее неизвестен,
// поэтому remotePatterns настраивать негде.
export function Avatar({
  url,
  name,
  size = 36,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? ''}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full border border-border bg-[var(--accent-tint-bg)] font-display font-medium text-accent"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}
