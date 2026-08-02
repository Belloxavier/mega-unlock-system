import { useMemo, useState } from 'react';
import type { Servicio, Garantia, TemaUI } from '../../types';
import {
  calcularCierre,
  textoResumenWhatsApp,
  type ResumenCierre,
  type CierreGuardado,
} from '../../lib/cierreCaja';
import { escapeHtml } from '../../lib/html';
import { formatearMonto } from '../../lib/moneda';

interface Props {
  abierto: boolean;
  T: TemaUI;
  servicios: Servicio[];
  garantias: Garantia[];
  historial: CierreGuardado[];
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (
    resumen: ResumenCierre,
    extra: { efectivoContado: number | null; nota: string }
  ) => void;
  fmt: (n: number) => string;
}

export function CierreCajaModal({
  abierto,
  T,
  servicios,
  garantias,
  historial,
  guardando,
  onCerrar,
  onGuardar,
  fmt,
}: Props) {
  const [efectivoContado, setEfectivoContado] = useState('');
  const [nota, setNota] = useState('');
  const [tab, setTab] = useState<'hoy' | 'historial'>('hoy');

  const resumen = useMemo(
    () => calcularCierre(servicios, garantias),
    [servicios, garantias]
  );

  if (!abierto) return null;

  const contadoNum =
    efectivoContado.trim() === '' ? null : parseFloat(efectivoContado.replace(',', '.'));
  const diferencia =
    contadoNum != null && !isNaN(contadoNum) ? contadoNum - resumen.efectivo : null;

  const handleCopiar = async () => {
    const texto = textoResumenWhatsApp(resumen, {
      efectivoContado: contadoNum,
      nota,
    });
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      window.prompt('Copia el resumen:', texto);
    }
  };

  const handleImprimir = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const filas = resumen.cobros
      .map(
        (c) =>
          `<tr>
            <td>${escapeHtml(c.hora)}</td>
            <td>${escapeHtml(c.folio)}</td>
            <td>${escapeHtml(c.cliente)}</td>
            <td>${escapeHtml(c.metodo)}</td>
            <td style="text-align:right">${formatearMonto(c.monto)}</td>
          </tr>`
      )
      .join('');
    const metodos = resumen.porMetodo
      .map((m) => `<li>${escapeHtml(m.metodo)}: ${formatearMonto(m.monto)} (${m.cantidad})</li>`)
      .join('');
    ventana.document.write(`
      <html><head><title>Cierre ${resumen.fecha}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;color:#111}
        h1{font-size:18px;margin:0}
        .sub{color:#555;font-size:12px;margin:4px 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#eee}
        .tot{font-weight:bold;margin-top:12px}
      </style></head><body>
        <h1>MEGA UNLOCK — Cierre de caja</h1>
        <p class="sub">Fecha ${escapeHtml(resumen.fecha)}</p>
        <p class="tot">Cobrado (neto): ${formatearMonto(resumen.cobradoTotal)} · ${resumen.nCobros} cobros</p>
        <ul>${metodos}</ul>
        <p>Por cobrar (acumulado): ${formatearMonto(resumen.porCobrar)}</p>
        <p>Devuelto garantías hoy: ${formatearMonto(resumen.devueltoGarantias)}</p>
        <p>Altas del día: ${resumen.nAltas}</p>
        ${
          diferencia != null
            ? `<p>Efectivo contado: ${formatearMonto(contadoNum!)} · Diferencia: ${formatearMonto(diferencia)}</p>`
            : ''
        }
        ${nota.trim() ? `<p>Nota: ${escapeHtml(nota.trim())}</p>` : ''}
        <table>
          <thead><tr><th>Hora</th><th>Folio</th><th>Cliente</th><th>Método</th><th>Monto</th></tr></thead>
          <tbody>${filas || '<tr><td colspan="5">Sin cobros hoy</td></tr>'}</tbody>
        </table>
        <script>window.print()</script>
      </body></html>
    `);
    ventana.document.close();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className={`text-sm font-black uppercase tracking-wider ${T.texto}`}>
            🧾 Cierre de caja
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-white text-sm px-2"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('hoy')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
              tab === 'hoy' ? T.filtroActivo + ' border-transparent' : 'border-slate-700 text-slate-400'
            }`}
          >
            Hoy ({resumen.fecha})
          </button>
          <button
            type="button"
            onClick={() => setTab('historial')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
              tab === 'historial' ? T.filtroActivo + ' border-transparent' : 'border-slate-700 text-slate-400'
            }`}
          >
            Historial ({historial.length})
          </button>
        </div>

        {tab === 'hoy' ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  Cobrado hoy (neto)
                </p>
                <p className="text-xl font-black text-emerald-300">{fmt(resumen.cobradoTotal)}</p>
                <p className="text-[10px] text-slate-500">{resumen.nCobros} cobros</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  Por cobrar
                </p>
                <p className="text-xl font-black text-amber-300">{fmt(resumen.porCobrar)}</p>
                <p className="text-[10px] text-slate-500">acumulado</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-4 space-y-1.5">
              {resumen.porMetodo.length === 0 ? (
                <p className="text-xs text-slate-500">Sin cobros hoy.</p>
              ) : (
                resumen.porMetodo.map((m) => (
                  <div key={m.metodo} className="flex justify-between text-xs">
                    <span className="text-slate-300">
                      {m.metodo} <span className="text-slate-600">({m.cantidad})</span>
                    </span>
                    <span className={`font-black ${T.fuerte}`}>{fmt(m.monto)}</span>
                  </div>
                ))
              )}
              {resumen.devueltoGarantias > 0 && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-rose-300">Devuelto garantías</span>
                  <span className="font-black text-rose-300">{fmt(resumen.devueltoGarantias)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-500">Altas del día</span>
                <span className="font-bold text-slate-300">{resumen.nAltas}</span>
              </div>
            </div>

            {/* Tabla historial de cobros del día */}
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Cobros de hoy
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden mb-4 max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 sticky top-0">
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-2">Hora</th>
                    <th className="py-2 px-2">Folio</th>
                    <th className="py-2 px-2">Cliente</th>
                    <th className="py-2 px-2">Método</th>
                    <th className="py-2 px-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {resumen.cobros.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500">
                        Sin cobros
                      </td>
                    </tr>
                  ) : (
                    resumen.cobros.map((c) => (
                      <tr key={c.id} className="text-slate-300">
                        <td className="py-1.5 px-2 font-mono text-[10px]">{c.hora}</td>
                        <td className="py-1.5 px-2 font-mono text-[10px]">{c.folio || '—'}</td>
                        <td className="py-1.5 px-2 truncate max-w-[100px]">{c.cliente}</td>
                        <td className="py-1.5 px-2 text-[10px]">{c.metodo}</td>
                        <td className="py-1.5 px-2 text-right font-bold">{fmt(c.monto)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cuadre efectivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Efectivo contado en caja
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  placeholder={String(resumen.efectivo.toFixed(2))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
                {diferencia != null && (
                  <p
                    className={`text-[10px] mt-1 font-bold ${
                      Math.abs(diferencia) < 0.01
                        ? 'text-emerald-400'
                        : diferencia < 0
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}
                  >
                    Diferencia vs sistema: {diferencia >= 0 ? '+' : ''}
                    {fmt(diferencia)} (sistema {fmt(resumen.efectivo)})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej. faltan $2000 propina"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleImprimir}
                className="flex-1 min-w-[100px] py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700"
              >
                🖨️ PDF
              </button>
              <button
                type="button"
                onClick={handleCopiar}
                className="flex-1 min-w-[100px] py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700"
              >
                📋 Copiar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={() =>
                  onGuardar(resumen, {
                    efectivoContado: contadoNum != null && !isNaN(contadoNum) ? contadoNum : null,
                    nota,
                  })
                }
                className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 ${T.submit}`}
              >
                {guardando ? 'Guardando…' : '💾 Guardar cierre'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {historial.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Aún no hay cierres guardados.
              </p>
            ) : (
              historial.map((h) => (
                <div
                  key={h.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 flex justify-between gap-3"
                >
                  <div>
                    <p className="font-mono font-bold text-sm text-slate-100">{h.fecha}</p>
                    <p className="text-[10px] text-slate-500">
                      {h.n_cobros} cobros · Altas {h.n_altas}
                      {h.nota ? ` · ${h.nota}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${T.fuerte}`}>{fmt(Number(h.cobrado_total))}</p>
                    <p className="text-[10px] text-slate-500">
                      Ef {fmt(Number(h.efectivo))} · Tr {fmt(Number(h.transferencia))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
