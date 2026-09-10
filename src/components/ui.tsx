import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// ВАЖНО: этот файл не должен импортировать '@/lib/i18n' (или что-либо ещё,
// что тянет next/headers) — ui.tsx подключают и клиентские компоненты
// (например src/app/error.tsx, обязан быть 'use client'). Если сюда попадёт
// серверный импорт, next build падает с ошибкой webpack ("You're importing a
// component that needs next/headers... a Client Component"). Компонент
// StatusBadge, которому нужен getDict(), поэтому вынесен в отдельный файл
// src/components/status-badge.tsx, импортируемый только из серверных страниц.

// Карточки/панели — почти острый радиус (4px), без тени; разделение с фоном
// страницы через hairline-обводку var(--border) + шаг цвета поверхности
// (design-system/jr-marketing/MASTER.md, Cards / Elevation).
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-border bg-surface transition-colors ${className}`}>
      {children}
    </div>
  );
}

type ButtonVariant = 'primary' | 'artist' | 'secondary' | 'ghost' | 'danger';

// Единый радиус по всему сайту — `rounded` (4px), тот же, что у карточек/полей.
// btn-pop (globals.css) — пружинистый «поп» на hover/active.
// min-h-11 = 44px: минимальный размер тач-цели (аудитория преимущественно
// мобильная). Без него кнопка выходила 40px — по пальцу промахнуться легко.
const buttonBase =
  'btn-pop inline-flex min-h-11 items-center justify-center gap-2 rounded px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
// primary — единственное доминирующее действие в поле зрения: сплошная
// timeline-blue заливка. artist — сплошная magenta (сторона артиста).
// secondary/ghost — хайрлайн-пилюля и текстовая ссылка. На hover — мягкое
// свечение в цвете самой кнопки (не тень-«коробка»).
const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent hover:brightness-110 hover:shadow-[0_10px_30px_-8px_rgba(59,130,246,0.55)]',
  artist:
    'bg-primary text-on-primary hover:brightness-110 hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.55)]',
  secondary:
    'border border-border bg-transparent text-text hover:border-white/25 hover:bg-white/[0.04] hover:shadow-[0_10px_30px_-10px_rgba(255,255,255,0.16)]',
  ghost: 'text-text-dim hover:text-text',
  danger:
    'border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] text-danger hover:brightness-110',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

// Визуально идентична Button, но рендерит <a> (next/link) — используйте для навигации,
// чтобы не вкладывать <button> внутрь <a> (некорректная вложенность/доступность).
export function LinkButton({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  LinkProps & { variant?: ButtonVariant; children: ReactNode }) {
  return (
    <Link className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

// Ссылка "Назад" для страниц, куда заходят не через верхнее меню (детали заявки,
// детали кампании, формы регистрации/входа/создания трека) — без неё оттуда
// некуда деться, кроме кнопки "назад" в браузере.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-dim transition hover:text-text"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}

// Пустое состояние списка (нет треков/заявок/эдиторов и т.д.) — SVG-иконка
// (Lucide) вместо голого текста, чтобы страница не выглядела как ошибка загрузки.
export function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-tint-bg)] text-accent"
        aria-hidden="true"
      >
        <Icon size={22} strokeWidth={1.5} />
      </span>
      <p className="text-sm text-text-faint">{text}</p>
    </Card>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

// Поля ввода — радиус 4px, тёмная заливка, видимый фокус: смена цвета обводки
// + мягкий синий ring (design-system/jr-marketing/MASTER.md, Inputs).
export const inputClass =
  'w-full min-h-11 rounded-[4px] border border-border bg-surface2/60 px-4 py-2.5 text-sm text-text placeholder:text-text-faint outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(59,130,246,0.30)]';

// Оценка 1-5 для форм отзыва — кружки-кнопки на radio + peer-checked, без
// JavaScript, работает в любом браузере. По умолчанию выбрано 5. Круглая форма
// (rounded-full) здесь — не "карточка/инпут", а тег-подобный UI-элемент, поэтому
// пилюльный радиус уместен и без изменений совпадает с эталоном.
export function RatingInput({ label }: { label: string }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name="rating" value={n} defaultChecked={n === 5} className="peer sr-only" />
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-sm font-semibold text-text-dim transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent">
              {n}
            </span>
          </label>
        ))}
      </div>
    </Field>
  );
}
