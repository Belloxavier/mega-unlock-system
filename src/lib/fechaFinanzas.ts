/**
 * Rangos de calendario (lunes–domingo) en zona local.
 * Evita el "últimos 7 días rodantes" que mezclaba semanas parciales.
 */

function inicioDelDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function finDelDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Lunes 00:00 de la semana que contiene `ref` (ISO-like, lunes = inicio). */
export function inicioSemana(ref: Date = new Date()): Date {
  const d = inicioDelDia(ref);
  const dia = d.getDay(); // 0=dom … 6=sáb
  const offsetLunes = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offsetLunes);
  return d;
}

export function finSemana(ref: Date = new Date()): Date {
  const ini = inicioSemana(ref);
  const fin = new Date(ini);
  fin.setDate(fin.getDate() + 6);
  return finDelDia(fin);
}

export function inicioSemanaPasada(ref: Date = new Date()): Date {
  const ini = inicioSemana(ref);
  ini.setDate(ini.getDate() - 7);
  return ini;
}

export function finSemanaPasada(ref: Date = new Date()): Date {
  const fin = finSemana(ref);
  fin.setDate(fin.getDate() - 7);
  return fin;
}

export function estaEnRango(fechaIso: string, desde: Date, hasta: Date): boolean {
  const t = new Date(fechaIso).getTime();
  return t >= desde.getTime() && t <= hasta.getTime();
}

export function inicioMes(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
}

export function finMes(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function inicioMesPasado(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 0, 0, 0, 0);
}

export function finMesPasado(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 0, 23, 59, 59, 999);
}
