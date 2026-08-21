import type { TemaUI } from '../../../types';

const ESTADOS_FILTRO = [
  'todos',
  'activos',
  'PENDIENTE',
  'EN PROCESO',
  'COMPLETADO',
  'ENTREGADO',
  'NO REALIZADO',
] as const;

interface Props {
  T: TemaUI;
  filtroEstado: string;
  filtroPagado: 'todos' | 'pagado' | 'sin_pagar';
  conteosPorEstado: { [estado: string]: number };
  conteosPorPagado: { pagado: number; sin_pagar: number };
  onFiltroEstado: (v: string) => void;
  onFiltroPagado: (v: 'todos' | 'pagado' | 'sin_pagar') => void;
}

// Compartido por Historial (Inicio) y Área de Trabajo — mismo estado de
// filtros (ver Dashboard.tsx), así que esta es la única copia de la UI de
// los chips de Estado/Pago.
export function FiltrosEstadoPago({
  T,
  filtroEstado,
  filtroPagado,
  conteosPorEstado,
  conteosPorPagado,
  onFiltroEstado,
  onFiltroPagado,
}: Props) {
  return (
    <>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Estado</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ESTADOS_FILTRO.map((est) => {
          const cantidad =
            est === 'todos'
              ? Object.values(conteosPorEstado).reduce((a, b) => a + b, 0)
              : est === 'activos'
              ? (conteosPorEstado['PENDIENTE'] || 0) + (conteosPorEstado['EN PROCESO'] || 0)
              : conteosPorEstado[est] || 0;
          const activo = filtroEstado === est;
          return (
            <button
              key={est}
              type="button"
              onClick={() => onFiltroEstado(activo ? 'todos' : est)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                activo ? T.filtroActivo + ' border-transparent' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-600'
              }`}
            >
              {est === 'todos' ? 'Todos' : est === 'activos' ? '🔵 Activos' : est} ({cantidad})
            </button>
          );
        })}
      </div>

      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pago</p>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(
          [
            ['pagado', `💰 Pagado (${conteosPorPagado.pagado})`],
            ['sin_pagar', `Sin pagar (${conteosPorPagado.sin_pagar})`],
          ] as const
        ).map(([valor, etiqueta]) => {
          const activo = filtroPagado === valor;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => onFiltroPagado(activo ? 'todos' : valor)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                activo ? T.filtroActivo + ' border-transparent' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-600'
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>
    </>
  );
}
