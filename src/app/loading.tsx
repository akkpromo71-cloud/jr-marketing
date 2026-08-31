// Next.js подхватывает этот файл автоматически и показывает его как fallback
// на время, пока серверные компоненты страницы грузят данные — работает для
// первого захода и для переходов между разделами (лента, кабинет, админка,
// заявки и т.д.), без правок в каждой странице по отдельности.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
