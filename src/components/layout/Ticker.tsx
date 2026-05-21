export default function Ticker() {
  const items = [
    '⚽ SAFC 3 – 1 World Girls FC',
    '🏆 LFA Super Cup Winners 2024/25',
    '📅 Next: SAFC vs Monrovia Queens',
    '🔴 Shaita Angels FC — Careysburg, Liberia',
    '⚽ SAFC 3 – 1 World Girls FC',
    '🏆 LFA Super Cup Winners 2024/25',
    '📅 Next: SAFC vs Monrovia Queens',
    '🔴 Shaita Angels FC — Careysburg, Liberia',
  ]

  return (
    <div style={{ background: '#CC0000' }} className="overflow-hidden py-2">
      <div className="flex gap-10 whitespace-nowrap animate-[ticker_25s_linear_infinite]">
        {items.map((item, i) => (
          <span key={i} className="text-white text-xs font-bold tracking-widest flex-shrink-0">
            {item}
            <span className="mx-4 opacity-40">•</span>
          </span>
        ))}
      </div>
    </div>
  )
}