import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { ApplicationStatus, CampaignStatus, EditorStatus } from '@/lib/types';
import { getDict } from '@/lib/i18n';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-card transition ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

// active:scale — тактильный отклик на нажатие для всех вариантов сразу
// (transform уже входит в набор свойств дефолтного Tailwind `transition`).
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-accent hover:brightness-105 hover:-translate-y-0.5',
  secondary: 'border border-border bg-surface2/40 text-text hover:bg-surface2',
  ghost: 'text-text-dim hover:text-text',
  danger:
    'border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] text-danger hover:brightness-105',
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

const statusStyles: Record<string, string> = {
  open: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  in_progress: 'text-accent bg-[var(--accent-tint-bg)] border-[var(--accent-tint-border)]',
  completed: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  closed: 'text-text-faint bg-surface2 border-border',
  pending: 'text-warning bg-[var(--warning-tint-bg)] border-[var(--warning-tint-border)]',
  accepted: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
  rejected: 'text-danger bg-[var(--danger-tint-bg)] border-[var(--danger-tint-border)]',
  in_revision: 'text-warning bg-[var(--warning-tint-bg)] border-[var(--warning-tint-border)]',
  delivered: 'text-accent bg-[var(--accent-tint-bg)] border-[var(--accent-tint-border)]',
  approved: 'text-success bg-[var(--success-tint-bg)] border-[var(--success-tint-border)]',
};

// Подписи статусов берутся из словаря i18n (src/lib/i18n.ts) — StatusBadge сам
// определяет текущий язык по cookie, поэтому вызывающему коду ничего передавать не нужно.
export async function StatusBadge({
  status,
}: {
  status: CampaignStatus | ApplicationStatus | EditorStatus;
}) {
  const { t } = await getDict();
  const statusLabels: Record<string, string> = t.status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] ?? 'text-text-faint bg-surface2 border-border'
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
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

// Пустое состояние списка (нет треков/заявок/эдиторов и т.д.) — иконка вместо
// голого текста, чтобы страница не выглядела как ошибка загрузки.
export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-tint-bg)] text-2xl"
        aria-hidden="true"
      >
        {icon}
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

export const inputClass =
  'w-full rounded-xl border border-border bg-surface2/50 px-4 py-2.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent transition';

// Оценка 1-5 для форм отзыва — кружки-кнопки на radio + peer-checked, без
// JavaScript, работает в любом браузере. По умолчанию выбрано 5.
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
