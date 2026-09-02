import Image from 'next/image';

// Простой компонент аватара: если в профиле есть картинка — показываем её,
// иначе — кружок с первой буквой имени (чтобы в списках/ленте не было "дыр"
// там, где аватар ещё не загружен). Аватарки лежат в Supabase Storage одного
// известного проекта (**.supabase.co, см. next.config.mjs -> images.remotePatterns),
// поэтому next/image можно использовать вместо обычного <img> — автоматическая
// оптимизация/сжатие и правильные srcset вместо полноразмерной картинки.
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
      <Image
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
