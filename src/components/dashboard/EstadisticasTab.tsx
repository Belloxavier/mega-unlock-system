import { useMemo, useState } from 'react';
import type { Servicio, TemaUI } from '../../types';
import { getDotColor } from '../../lib/estado';
import { getFechaLocal, sumarDias } from '../../lib/date';
import { formatearPorcentaje } from '../../lib/moneda';
import {
  calcularSnapshotEstados,
  calcularVolumen,
  calcularPorDiaSemana,
  calcularPorTipoTrabajo,
  calcularPorModelo,
  calcularSerieAgrupada,
  calcularComparacionPeriodo,
  calcularComparacionSemana,
  calcularComparacionMes,
  calcularHistorialDia,
  type Agrupacion,
  type ComparacionSemanaMes,
} from '../../lib/estadisticasOperativas';

const TOPE_RANKING = 8;

interface Props {
  T: TemaUI;
  servicios: Servicio[];
  fmt: (n: number) => string;
}

const ETIQUETA_ESTADO: { [estado: string]: string } = {
  PENDIENTE: 'Pendiente',
  'EN PROCESO': 'En proceso',
  COMPLETADO: 'Completado',
  ENTREGADO: 'Entregado',
  'NO REALIZADO': 'No realizado',
};

const OPCIONES_DIAS = [7, 30, 90, 180, 365] as const;

// Versión compacta ("15/07") para etiquetas dentro de tarjetas chicas.
function formatearFechaCorta(fechaStr: string): string {
  const [, m, d] = fechaStr.split('-');
  return `${d}/${m}`;
}

// Nombre real del mes ("Febrero") a partir de una fecha YYYY-MM-DD local —
// para no obligar a hacer la cuenta mental de qué mes es "actual"/"anterior".
function nombreMes(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString('es-CL', { month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function BarraCantidad({
  nombre,
  cantidad,
  max,
  barraClass,
}: {
  nombre: string;
  cantidad: number;
  max: number;
  barraClass: string;
}) {
  const pct = Math.round((cantidad / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 sm:w-24 text-[11px] font-semibold text-slate-400 truncate flex-shrink-0" title={nombre}>
        {nombre}
      </span>
      <div className="flex-1 h-5 bg-slate-950/80 rounded-md overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-md transition-all bg-gradient-to-r ${barraClass}`}
          style={{ width: `${Math.max(pct, cantidad > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="w-10 text-right text-[10px] font-black text-slate-200 flex-shrink-0">{cantidad}</span>
    </div>
  );
}

function MiniStat({
  label,
  valor,
  T,
  colorClass,
}: {
  label: string;
  valor: React.ReactNode;
  T: TemaUI;
  colorClass?: string;
}) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-base font-black ${colorClass || T.texto}`}>{valor}</p>
    </div>
  );
}

function FilaComparacion({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-200">{valor}</span>
    </div>
  );
}

// Deliberadamente sin dinero — eso ya lo cubre Finanzas (Semana/Mes Actual
// vs Anterior). Acá es puramente "cuánto trabajo hice", no "cuánta plata
// generé", para no mostrar la misma comparación dos veces en dos pestañas.
function BloqueComparacion({
  titulo,
  data,
  T,
  esSemana,
}: {
  titulo: string;
  data: ComparacionSemanaMes;
  T: TemaUI;
  /** true = etiqueta con rango de fechas (semana), false = nombre del mes. */
  esSemana: boolean;
}) {
  const deltaTrabajos = data.actual.trabajos - data.anterior.trabajos;
  const labelActual = esSemana
    ? `${formatearFechaCorta(data.actual.fechaInicio)} – ${formatearFechaCorta(data.actual.fechaFin)}`
    : nombreMes(data.actual.fechaInicio);
  const labelAnterior = esSemana
    ? `${formatearFechaCorta(data.anterior.fechaInicio)} – ${formatearFechaCorta(data.anterior.fechaFin)}`
    : nombreMes(data.anterior.fechaInicio);
  return (
    <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
      <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-4`}>{titulo}</h3>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate" title={labelActual}>
            {labelActual}
          </p>
          <div className="space-y-1.5">
            <FilaComparacion label="Trabajos" valor={String(data.actual.trabajos)} />
            <FilaComparacion label="Pagos" valor={String(data.actual.pagos)} />
            <FilaComparacion label="Prom./día" valor={data.actual.promedioTrabajosPorDia.toFixed(1)} />
          </div>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate" title={labelAnterior}>
            {labelAnterior}
          </p>
          <div className="space-y-1.5">
            <FilaComparacion label="Trabajos" valor={String(data.anterior.trabajos)} />
            <FilaComparacion label="Pagos" valor={String(data.anterior.pagos)} />
            <FilaComparacion label="Prom./día" valor={data.anterior.promedioTrabajosPorDia.toFixed(1)} />
          </div>
        </div>
      </div>
      <div
        className={`text-[11px] font-bold pt-2 border-t border-slate-800 ${
          deltaTrabajos >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {deltaTrabajos >= 0 ? '▲' : '▼'} {Math.abs(deltaTrabajos)} trabajos vs. período anterior
      </div>
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 mt-3">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mejor día</p>
        <p className={`text-sm font-black ${T.texto}`}>
          {data.actual.mejorDiaPorTrabajos
            ? `${formatearFechaCorta(data.actual.mejorDiaPorTrabajos.fecha)} · ${data.actual.mejorDiaPorTrabajos.cantidad} trabajos`
            : '—'}
        </p>
      </div>
    </div>
  );
}

export function EstadisticasTab({ T, servicios, fmt }: Props) {
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('dia');
  const [diasComparacion, setDiasComparacion] = useState<number>(30);
  const [fechaHistorial, setFechaHistorial] = useState(() => getFechaLocal(new Date()));
  const [verTodosTipo, setVerTodosTipo] = useState(false);
  const [verTodosModelo, setVerTodosModelo] = useState(false);
  const hoy = getFechaLocal(new Date());

  const snapshotEstados = useMemo(() => calcularSnapshotEstados(servicios), [servicios]);
  const volumen = useMemo(() => calcularVolumen(servicios), [servicios]);
  const porDiaSemana = useMemo(() => calcularPorDiaSemana(servicios), [servicios]);
  const porTipoTrabajo = useMemo(() => calcularPorTipoTrabajo(servicios), [servicios]);
  const porModelo = useMemo(() => calcularPorModelo(servicios), [servicios]);
  const serie = useMemo(() => calcularSerieAgrupada(servicios, agrupacion), [servicios, agrupacion]);
  const comparacionPeriodo = useMemo(
    () => calcularComparacionPeriodo(servicios, diasComparacion),
    [servicios, diasComparacion]
  );
  const comparacionSemana = useMemo(() => calcularComparacionSemana(servicios), [servicios]);
  const comparacionMes = useMemo(() => calcularComparacionMes(servicios), [servicios]);
  const historialDia = useMemo(() => calcularHistorialDia(servicios, fechaHistorial), [servicios, fechaHistorial]);

  const maxDiaSemana = Math.max(1, ...porDiaSemana.map((i) => i.cantidad));
  const maxTipoTrabajo = Math.max(1, ...porTipoTrabajo.map((i) => i.cantidad));
  const maxModelo = Math.max(1, ...porModelo.map((i) => i.cantidad));
  const maxSerie = Math.max(1, ...serie.map((i) => i.cantidad));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {snapshotEstados.map(({ estado, cantidad }) => (
          <div
            key={estado}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${getDotColor(estado)}`} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                {ETIQUETA_ESTADO[estado] || estado}
              </p>
            </div>
            <p className={`text-2xl font-black ${T.texto}`}>{cantidad}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Hoy', valor: volumen.hoy },
          { label: 'Esta semana', valor: volumen.semana },
          { label: 'Este mes', valor: volumen.mes },
          { label: 'Histórico total', valor: volumen.total },
        ].map((k) => (
          <div key={k.label} className={`${T.financeCard2} p-4 rounded-2xl backdrop-blur-md`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`text-2xl font-black ${T.texto2}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest`}>
            📊 Comparación por Período
          </h3>
          <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1 flex-wrap">
            {OPCIONES_DIAS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiasComparacion(d)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  diasComparacion === d ? T.filtroActivo : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-2.5">
          <MiniStat label="Total trabajos" valor={comparacionPeriodo.totalTrabajos} T={T} />
          <MiniStat
            label="Días trabajados"
            valor={`${comparacionPeriodo.diasTrabajados}/${comparacionPeriodo.dias}`}
            T={T}
          />
          <MiniStat
            label="Promedio/día trabajado"
            valor={comparacionPeriodo.promedioPorDiaTrabajado.toFixed(1)}
            T={T}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <MiniStat
            label="Mejor día"
            valor={
              comparacionPeriodo.mejorDia
                ? `${formatearFechaCorta(comparacionPeriodo.mejorDia.fecha)} · ${comparacionPeriodo.mejorDia.cantidad}`
                : 'Sin datos'
            }
            T={T}
            colorClass="text-emerald-400"
          />
          <MiniStat
            label="Peor día"
            valor={
              comparacionPeriodo.peorDia
                ? `${formatearFechaCorta(comparacionPeriodo.peorDia.fecha)} · ${comparacionPeriodo.peorDia.cantidad}`
                : 'Sin datos'
            }
            T={T}
            colorClass="text-amber-400"
          />
          <MiniStat
            label="Tendencia vs. período anterior"
            valor={
              comparacionPeriodo.tendenciaPct == null
                ? 'Sin datos previos'
                : formatearPorcentaje(comparacionPeriodo.tendenciaPct)
            }
            T={T}
            colorClass={
              comparacionPeriodo.tendenciaPct == null
                ? 'text-slate-500'
                : comparacionPeriodo.tendenciaPct >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BloqueComparacion titulo="📆 Semana Actual vs. Anterior" data={comparacionSemana} T={T} esSemana />
        <BloqueComparacion titulo="🗓️ Mes Actual vs. Anterior" data={comparacionMes} T={T} esSemana={false} />
      </div>

      <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
        <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-4`}>
          📅 Trabajos por Día de la Semana (Histórico)
        </h3>
        <div className="space-y-2.5">
          {porDiaSemana.map((item) => (
            <BarraCantidad
              key={item.nombre}
              nombre={item.nombre}
              cantidad={item.cantidad}
              max={maxDiaSemana}
              barraClass={T.barraGradiente}
            />
          ))}
        </div>
      </div>

      <div className={`bg-slate-900/80 border ${T.borde2} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
        <h3 className={`text-xs font-bold ${T.texto2} uppercase tracking-widest mb-4`}>
          🔧 Tipos de Trabajo Más Frecuentes (Histórico)
        </h3>
        {porTipoTrabajo.length === 0 ? (
          <p className="text-xs text-slate-500">Sin datos todavía.</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {(verTodosTipo ? porTipoTrabajo : porTipoTrabajo.slice(0, TOPE_RANKING)).map((item) => (
                <BarraCantidad
                  key={item.nombre}
                  nombre={item.nombre}
                  cantidad={item.cantidad}
                  max={maxTipoTrabajo}
                  barraClass="from-violet-500 to-fuchsia-400"
                />
              ))}
            </div>
            {porTipoTrabajo.length > TOPE_RANKING && (
              <button
                type="button"
                onClick={() => setVerTodosTipo((v) => !v)}
                className="w-full mt-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 bg-slate-950/40 hover:bg-slate-800 transition-colors"
              >
                {verTodosTipo ? '▲ Ver menos' : `▼ Ver todos (${porTipoTrabajo.length})`}
              </button>
            )}
          </>
        )}
      </div>

      <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
        <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-1`}>
          📱 Modelos Más Frecuentes (Histórico)
        </h3>
        <p className="text-[10px] text-slate-500 mb-4">Para saber qué equipos llegan más seguido y anticipar repuestos.</p>
        {porModelo.length === 0 ? (
          <p className="text-xs text-slate-500">Sin datos todavía.</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {(verTodosModelo ? porModelo : porModelo.slice(0, TOPE_RANKING)).map((item) => (
                <BarraCantidad
                  key={item.nombre}
                  nombre={item.nombre}
                  cantidad={item.cantidad}
                  max={maxModelo}
                  barraClass="from-cyan-500 to-blue-400"
                />
              ))}
            </div>
            {porModelo.length > TOPE_RANKING && (
              <button
                type="button"
                onClick={() => setVerTodosModelo((v) => !v)}
                className="w-full mt-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 bg-slate-950/40 hover:bg-slate-800 transition-colors"
              >
                {verTodosModelo ? '▲ Ver menos' : `▼ Ver todos (${porModelo.length})`}
              </button>
            )}
          </>
        )}
      </div>

      <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest`}>📈 Volumen por Período</h3>
          <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
            {(
              [
                ['dia', 'Día'],
                ['semana', 'Semana'],
                ['mes', 'Mes'],
              ] as const
            ).map(([modo, label]) => (
              <button
                key={modo}
                type="button"
                onClick={() => setAgrupacion(modo)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  agrupacion === modo ? T.filtroActivo : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          {serie.map((item, idx) => (
            <BarraCantidad
              key={`${item.etiqueta}-${idx}`}
              nombre={item.etiqueta}
              cantidad={item.cantidad}
              max={maxSerie}
              barraClass={T.barraGradiente}
            />
          ))}
        </div>
      </div>

      <div className={`bg-slate-900/80 border ${T.borde2} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
        <h3 className={`text-xs font-bold ${T.texto2} uppercase tracking-widest mb-4`}>
          📆 Historial Diario Reconstructivo
        </h3>
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFechaHistorial((f) => sumarDias(f, -1))}
            aria-label="Día anterior"
            className="flex-shrink-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white hover:border-cyan-400 transition-colors"
          >
            ←
          </button>
          <input
            type="date"
            value={fechaHistorial}
            onChange={(e) => setFechaHistorial(e.target.value)}
            className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => setFechaHistorial((f) => sumarDias(f, 1))}
            disabled={fechaHistorial >= hoy}
            aria-label="Día siguiente"
            className="flex-shrink-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white hover:border-cyan-400 transition-colors disabled:opacity-30 disabled:hover:border-slate-700"
          >
            →
          </button>
          {fechaHistorial !== hoy && (
            <button
              type="button"
              onClick={() => setFechaHistorial(hoy)}
              className="flex-shrink-0 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <MiniStat label="Trabajos" valor={historialDia.trabajos} T={T} />
          <MiniStat label="Ingresos (neto)" valor={fmt(historialDia.ingresos)} T={T} colorClass="text-emerald-400" />
          <MiniStat label="Pagos" valor={historialDia.pagos} T={T} />
          <MiniStat label="Entregados" valor={historialDia.entregados} T={T} />
          <MiniStat label="Pendientes al cierre" valor={historialDia.pendientesAlCierre} T={T} colorClass="text-amber-400" />
        </div>
        <p className="text-[10px] text-slate-600 mt-3">
          "Pendientes al cierre" es una aproximación reconstruida a partir de las fechas guardadas (no hay un registro histórico de cada cambio de estado).
        </p>
      </div>
    </div>
  );
}
