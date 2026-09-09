// Ночной визуал хиро: звуковая волна (magenta) слева перетекает в блоки
// монтажного таймлайна (blue) справа. Никаких хроматических градиентов —
// два сплошных цвета сторон + плоский синий vignette (разрешённый в системе
// единственный градиент). Статично, без анимации. Чистый inline-SVG,
// серверный компонент, детерминированные высоты (SSR == CSR).
const BARS = [
  0.22, 0.38, 0.3, 0.52, 0.44, 0.7, 0.58, 0.86, 0.64, 0.95, 0.8, 0.62, 0.9, 0.5,
  0.72, 0.4, 0.56, 0.34, 0.46, 0.26, 0.6, 0.42, 0.78, 0.5, 0.66, 0.36, 0.54, 0.3,
];

export function HeroVisual({ label }: { label: string }) {
  const width = 520;
  const height = 440;
  const mid = height / 2;
  const count = BARS.length;
  const gap = width / count;
  // Точка «склейки»: слева — волна, справа — клипы таймлайна.
  const splitIndex = Math.round(count * 0.6);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="jr-hero-glow" cx="70%" cy="18%" r="75%">
          <stop offset="0%" stopColor="rgba(59,130,246,0.20)" />
          <stop offset="60%" stopColor="rgba(59,130,246,0.04)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="url(#jr-hero-glow)" />

      {/* baseline / playhead */}
      <line x1="0" y1={mid} x2={width} y2={mid} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      <line
        x1={splitIndex * gap + gap / 2}
        y1="24"
        x2={splitIndex * gap + gap / 2}
        y2={height - 24}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        strokeDasharray="2 4"
      />

      {BARS.map((amp, i) => {
        const x = i * gap + gap / 2;
        if (i < splitIndex) {
          // Волна: симметричная вертикальная линия от центра, magenta.
          const half = (amp * height) / 2.4;
          return (
            <line
              key={i}
              x1={x}
              y1={mid - half}
              x2={x}
              y2={mid + half}
              stroke="#ec4899"
              strokeWidth={Math.max(gap * 0.34, 2)}
              strokeLinecap="round"
              opacity={0.92}
            />
          );
        }
        // Таймлайн: прямоугольные клипы ровной высоты, blue, с зазором.
        const clipH = 30 + (i % 3) * 16;
        const clipW = gap * 0.66;
        return (
          <rect
            key={i}
            x={x - clipW / 2}
            y={mid - clipH / 2}
            width={clipW}
            height={clipH}
            rx="2"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            opacity={0.92}
          />
        );
      })}

      {/* верхняя/нижняя монтажные дорожки справа — намёк на треки в таймлайне */}
      {[mid - 96, mid + 96].map((y, k) => (
        <g key={k} opacity="0.5">
          {[0, 1, 2].map((j) => {
            const startX = (splitIndex + 0.4) * gap + j * gap * 3.2;
            return (
              <rect
                key={j}
                x={startX}
                y={y - 9}
                width={gap * 2.4}
                height="18"
                rx="2"
                fill="rgba(59,130,246,0.14)"
                stroke="rgba(59,130,246,0.45)"
                strokeWidth="1"
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}
