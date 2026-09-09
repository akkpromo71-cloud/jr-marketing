'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Правило публикации, которое видит эдитор (лента, страница кампании, заявка):
// ролик выкладывается на аккаунте эдитора под трек артиста, в описании —
// строка `caption` (название трека + ник артиста, если задан). Кнопка копирует
// строку в буфер. Строки локали приходят пропсом — компонент клиентский.
export function PublishGuide({
  caption,
  labels,
}: {
  caption: string;
  labels: { title: string; body: string; copy: string; copied: string };
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* буфер обмена недоступен — тихо игнорируем, строку видно и так */
    }
  }

  return (
    <div className="rounded-[4px] border border-border bg-surface2/30 p-4">
      <p className="text-meta text-text-faint">{labels.title}</p>
      <p className="mt-2 text-sm text-text-dim">{labels.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-words rounded-[4px] border border-border bg-bg px-3 py-2 font-mono text-sm text-text">
          {caption}
        </code>
        <button
          type="button"
          onClick={copy}
          className="btn-pop inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-text-dim hover:border-white/25 hover:text-text"
        >
          {copied ? (
            <Check size={14} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={14} strokeWidth={2} aria-hidden="true" />
          )}
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </div>
  );
}
