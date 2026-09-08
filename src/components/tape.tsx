'use client';

// «Лента» (REDESIGN_PLAN.md §3) — единственный авторский motion-жест сайта.
// Тонкая чёрная полоса во всю ширину под хиро: моноширинным служебным
// текстом непрерывно ползут НАСТОЯЩИЕ цифры площадки (собираются на сервере
// из тех же RPC, что уже вызывает лендинг, и передаются готовым списком строк).
//
// - hover ставит анимацию на паузу (см. .animate-tape:hover в globals.css),
//   чтобы прочитать конкретную строку;
// - при prefers-reduced-motion: reduce класс .animate-tape не несёт анимации
//   (объявлен только внутри @media no-preference), содержимое просто обрезается
//   по overflow-hidden — видно первые пункты, без движения;
// - если строк нет — не рендерится вовсе (лендинг и так прячет пустые секции).
export function Tape({ items }: { items: string[] }) {
  if (!items.length) return null;

  // Дублируем дорожку: сдвиг на -50% в keyframes зацикливается бесшовно.
  const track = [...items, ...items];

  return (
    <div className="full-bleed select-none overflow-hidden border-y border-border bg-accent text-on-accent">
      <div className="animate-tape flex w-max whitespace-nowrap py-2.5">
        {track.map((item, i) => (
          <span key={i} className="flex items-center text-micro uppercase tabular">
            <span aria-hidden="true" className="mx-6 opacity-40">
              &#9670;
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
