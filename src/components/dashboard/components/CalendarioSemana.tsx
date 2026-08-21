import { useState } from 'react';
import type { TemaUI } from '../../../types';
import { getFechaLocal, sumarDias, sumarMeses } from '../../../lib/date';

interface Props {
  T: TemaUI;
  /** Lunes de la semana elegida (YYYY-MM-DD), o null si no hay ninguna elegida todavía. */
  semanaSeleccionada: string | null;
  onSeleccionarSemana: (lunes: string) => void;
}

const DIAS_CABECERA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function lunesDe(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const dia = new Date(y, m - 1, d).getDay(); // 0=domingo..6=sábado
  const offset = dia === 0 ? -6 : 1 - dia;
  return sumarDias(fechaStr, offset);
}

// Grilla de semanas completas (lunes-domingo) que cubren el mes — puede
// incluir días de los meses vecinos para completar la primera/última fila,
// como cualquier calendario mensual normal.
function grillaMes(mesVisible: string): string[][] {
  const [y, m] = mesVisible.split('-').map(Number);
  const primerDiaSigMes = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  let cursor = lunesDe(`${mesVisible}-01`);
  const semanas: string[][] = [];
  while (cursor < primerDiaSigMes) {
    const semana: string[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(cursor);
      cursor = sumarDias(cursor, 1);
    }
    semanas.push(semana);
  }
  return semanas;
}

function formatearMes(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number);
  const texto = new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Calendario mensual donde se elige una SEMANA completa (no un día suelto)
// — tocar cualquier día resalta y selecciona toda su fila (lunes-domingo).
export function CalendarioSemana({ T, semanaSeleccionada, onSeleccionarSemana }: Props) {
  const hoy = getFechaLocal(new Date());
  const [mesVisible, setMesVisible] = useState(() => (semanaSeleccionada || hoy).slice(0, 7));

  const semanas = grillaMes(mesVisible);

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setMesVisible((m) => sumarMeses(m, -1))}
          aria-label="Mes anterior"
          className="px-2.5 py-1.5 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-400 transition-colors"
        >
          ←
        </button>
        <span className={`text-xs font-bold uppercase tracking-wider ${T.texto}`}>{formatearMes(mesVisible)}</span>
        <button
          type="button"
          onClick={() => setMesVisible((m) => sumarMeses(m, 1))}
          aria-label="Mes siguiente"
          className="px-2.5 py-1.5 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-400 transition-colors"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_CABECERA.map((d) => (
          <span key={d} className="text-center text-[9px] font-bold text-slate-500 uppercase">
            {d}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {semanas.map((semana) => {
          const esSemanaElegida = semana[0] === semanaSeleccionada;
          return (
            <div
              key={semana[0]}
              role="button"
              tabIndex={0}
              onClick={() => onSeleccionarSemana(semana[0])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSeleccionarSemana(semana[0]);
              }}
              className={`grid grid-cols-7 gap-1 rounded-lg p-0.5 cursor-pointer transition-colors ${
                esSemanaElegida ? T.filtroActivo : 'hover:bg-slate-800/60'
              }`}
            >
              {semana.map((dia) => {
                const delMesVisible = dia.startsWith(mesVisible);
                const esHoy = dia === hoy;
                return (
                  <span
                    key={dia}
                    className={`text-center text-[11px] py-1.5 rounded-md ${
                      esSemanaElegida
                        ? 'font-bold'
                        : delMesVisible
                          ? 'text-slate-200'
                          : 'text-slate-600'
                    } ${esHoy && !esSemanaElegida ? 'border border-cyan-400/50' : ''}`}
                  >
                    {Number(dia.slice(-2))}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
