// Стилизованный вертикальный плейсхолдер 9:16 для карточек развилки ролей:
// у артиста — «кадр из эдита» (рамка ролика + play), у эдитора — «монтажная
// раскладка» (стек клипов + playhead). Приглушённый фон карточки с
// градиентом-затемнением под текст. Реальных материалов нет — это заглушка,
// а не пустота. Чисто декоративный inline-SVG, серверный компонент.
export function RoleVisual({ role }: { role: 'artist' | 'editor' }) {
  const isArtist = role === 'artist';
  const stroke = isArtist ? '#ec4899' : '#3b82f6';

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: isArtist
            ? 'radial-gradient(130% 90% at 85% 0%, rgba(236,72,153,0.16), transparent 55%)'
            : 'radial-gradient(130% 90% at 85% 0%, rgba(59,130,246,0.14), transparent 55%)',
        }}
      />

      <svg
        viewBox="0 0 90 160"
        className="absolute -right-4 -top-6 h-52 w-[7.3rem] opacity-[0.16] sm:h-64 sm:w-36"
        fill="none"
      >
        <rect x="3" y="3" width="84" height="154" rx="8" stroke={stroke} strokeWidth="2" />
        {isArtist ? (
          <>
            {/* play + «субтитры» */}
            <path d="M38 66l20 12-20 12z" fill={stroke} />
            <rect x="18" y="120" width="54" height="4" rx="2" fill={stroke} />
            <rect x="18" y="132" width="36" height="4" rx="2" fill={stroke} />
          </>
        ) : (
          <>
            {/* стек клипов таймлайна */}
            {[30, 52, 74, 96].map((y, i) => (
              <rect
                key={y}
                x="16"
                y={y}
                width={i % 2 ? 44 : 58}
                height="12"
                rx="3"
                stroke={stroke}
                strokeWidth="2"
              />
            ))}
            <line x1="45" y1="18" x2="45" y2="142" stroke={stroke} strokeWidth="2" strokeDasharray="3 4" />
          </>
        )}
      </svg>

      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/20" />
    </div>
  );
}
