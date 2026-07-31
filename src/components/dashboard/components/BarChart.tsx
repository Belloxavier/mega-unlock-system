import type { RankingItem } from '../../../lib/reporteMensual';

interface Props {
  items: RankingItem[];
  fmt: (n: number) => string;
  /** Clases Tailwind del relleno de la barra (gradiente o sólido). */
  barraClass?: string;
  maxItems?: number;
  emptyText?: string;
}

/**
 * Barras horizontales puras CSS — mismo estilo que Finanzas (flujo por día).
 * Sin Chart.js / Recharts: cero dependencias y se ve bien en móvil.
 */
export function BarChart({
  items,
  fmt,
  barraClass = 'bg-gradient-to-r from-cyan-500 to-cyan-300',
  maxItems = 8,
  emptyText = 'Sin datos',
}: Props) {
  const data = items.slice(0, maxItems);
  const max = Math.max(1, ...data.map((i) => i.monto));

  if (data.length === 0) {
    return <p className="text-xs text-slate-500 py-2">{emptyText}</p>;
  }

  return (
    <div className="space-y-2.5">
      {data.map((item) => {
        const pct = Math.round((item.monto / max) * 100);
        return (
          <div key={item.nombre} className="flex items-center gap-2">
            <span
              className="w-20 sm:w-24 text-[10px] font-semibold text-slate-400 truncate flex-shrink-0"
              title={item.nombre}
            >
              {item.nombre}
            </span>
            <div className="flex-1 h-5 bg-slate-950/80 rounded-md overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-md transition-all ${barraClass}`}
                style={{ width: `${Math.max(pct, item.monto > 0 ? 4 : 0)}%` }}
                title={`${item.nombre}: ${fmt(item.monto)} (${item.cantidad})`}
              />
            </div>
            <span className="w-16 sm:w-20 text-right text-[10px] font-black text-slate-200 flex-shrink-0">
              {fmt(item.monto)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
