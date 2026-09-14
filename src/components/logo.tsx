// Новый знак J/R (взамен растрового логотипа — глянцевые губы с бриллиантовой
// челюстью и звезда в фиолетово-розово-синей хромовой заливке, наследие
// музыкального маркетплейса, не сочетается ни с одной осмысленной палитрой
// клиппинг-платформы). Инлайновый SVG, а не растр: чёткий на любом экране,
// перекрашивается через currentColor, не тянет отдельный файл.
//
// Идея знака: скруглённый бейдж с ОДНИМ прямым срезанным углом (буквально
// «отрезанный уголок» — образ клипа/нарезки) и стрелкой-play внутри —
// читается как «клип» уже в силуэте, без текста, работает и в 16px фавиконке.
export function LogoMark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path
        d="M18 4 H40 L60 24 V46 Q60 60 46 60 H18 Q4 60 4 46 V18 Q4 4 18 4 Z"
        fill="var(--surface-2)"
      />
      <path d="M25 21 L25 43 L45 32 Z" fill="var(--primary)" />
    </svg>
  );
}

// Знак + текстовый лого рядом — используется в шапке/подвале там, где раньше
// стоял <Image src="/logo-mark.webp">.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-full w-auto" />
      <span className="font-display text-lg font-bold leading-none text-text">J/R</span>
    </span>
  );
}
