// «Лента» — бегущая строка реальных цифр площадки под хиро.
// Серверный компонент, без JS: две одинаковые копии списка едут влево, трек
// сдвигается ровно на половину своей ширины (см. .ticker в globals.css) —
// склейка бесшовная, полоса заполнена всегда, сколько бы пунктов ни было.
// Пауза при наведении/фокусе; при prefers-reduced-motion — одна копия без
// движения. Если пунктов нет — не рендерится вовсе.
export function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  // Длительность пропорциональна числу пунктов, чтобы скорость чтения была
  // одинаковой и при 3, и при 15 пунктах.
  const durationSeconds = Math.max(items.length * 4.5, 16);

  const Row = ({ copy }: { copy: 'a' | 'b' }) => (
    <ul className="ticker__row" aria-hidden={copy === 'b' ? true : undefined}>
      {items.map((item, i) => (
        <li key={`${copy}-${i}`} className="ticker__item">
          <span className="ticker__diamond" aria-hidden="true">
            &#9670;
          </span>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="ticker full-bleed"
      style={{ ['--tk-dur' as string]: `${durationSeconds}s` }}
    >
      <div className="ticker__track">
        <Row copy="a" />
        <Row copy="b" />
      </div>
    </div>
  );
}
