'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Всплывающее уведомление снизу экрана вместо статичной плашки в потоке
// страницы — появляется, когда в URL есть параметр-триггер (успех или
// ошибка), затем сам стирает этот параметр из адресной строки, чтобы
// обновление страницы не показывало тост повторно. Анимация .animate-toast-in
// объявлена в globals.css и уважает prefers-reduced-motion.
function ToastInner({
  successParam,
  successMessage,
  errorParam,
}: {
  successParam?: string;
  successMessage?: string;
  errorParam?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const errorText = errorParam ? searchParams.get(errorParam) : null;
    const hasSuccess = successParam ? searchParams.has(successParam) : false;

    let next: { text: string; kind: 'success' | 'error' } | null = null;
    if (errorText) {
      next = { text: decodeURIComponent(errorText), kind: 'error' };
    } else if (hasSuccess && successMessage) {
      next = { text: successMessage, kind: 'success' };
    }
    if (!next) return;
    setToast(next);

    const params = new URLSearchParams(searchParams.toString());
    if (errorParam) params.delete(errorParam);
    if (successParam) params.delete(successParam);
    const query = params.toString();
    router.replace(query ? `?${query}` : '?', { scroll: false });

    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
    // Срабатывает только один раз при монтировании (на основе исходных
    // searchParams с сервера) — не нужно перезапускать при каждом рендере.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      className={`animate-toast-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-3 text-sm font-semibold shadow-card ${
        toast.kind === 'error'
          ? 'border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] text-danger'
          : 'border-[var(--success-tint-border)] bg-[var(--success-tint-bg)] text-success'
      }`}
    >
      {toast.text}
    </div>
  );
}

// useSearchParams требует границы Suspense в Next.js App Router — вынесено
// сюда, чтобы вызывающему коду не нужно было оборачивать <Toast /> самому.
export function Toast(props: { successParam?: string; successMessage?: string; errorParam?: string }) {
  return (
    <Suspense fallback={null}>
      <ToastInner {...props} />
    </Suspense>
  );
}
