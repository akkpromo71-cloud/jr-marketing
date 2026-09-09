'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

// Мобильное меню шапки для авторизованных: гамбургер -> выпадающая панель со
// ссылками раздела и выходом. Ссылки приходят с сервера (Nav знает роль);
// форма выхода передаётся как `footer` (серверный экшен работает и внутри
// клиентского компонента). Закрывается по выбору пункта, смене роута, Esc и
// клику по подложке.
export function NavMenu({
  links,
  footer,
  menuLabel,
}: {
  links: { href: string; label: string }[];
  footer?: ReactNode;
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={menuLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="btn-pop flex size-9 items-center justify-center rounded-full border border-border text-text-dim hover:border-white/25 hover:text-text"
      >
        {open ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-[4px] border border-border bg-surface p-1.5 shadow-overlay">
            <nav className="flex flex-col">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-[2px] px-3 py-2.5 text-sm transition ${
                      active
                        ? 'bg-white/[0.05] text-text'
                        : 'text-text-dim hover:bg-white/[0.04] hover:text-text'
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            {footer && (
              <div className="mt-1.5 border-t border-border pt-1.5 [&_button]:w-full [&_button]:rounded-[2px] [&_button]:px-3 [&_button]:py-2.5 [&_button]:text-left [&_button]:text-sm [&_button]:text-text-faint [&_button]:transition hover:[&_button]:bg-white/[0.04] hover:[&_button]:text-text">
                {footer}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
