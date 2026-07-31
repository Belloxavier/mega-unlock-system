/** Validación IMEI: 14–15 dígitos + checksum Luhn (15 dígitos). */

export function soloDigitos(s: string): string {
  return (s || '').replace(/\D/g, '');
}

export function pareceImeiStrict(valor: string | null | undefined): boolean {
  const d = soloDigitos(valor || '');
  return d.length === 14 || d.length === 15;
}

/** Luhn para IMEI de 15 dígitos. 14 dígitos (IMEI sin check) se aceptan sin Luhn. */
export function imeiValido(valor: string | null | undefined): boolean {
  const d = soloDigitos(valor || '');
  if (d.length === 14) return true;
  if (d.length !== 15) return false;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let n = parseInt(d[i], 10);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function mensajeImeiInvalido(valor: string): string | null {
  const d = soloDigitos(valor);
  if (!d) return null;
  if (d.length < 14) return `IMEI/serie corto (${d.length} dígitos). Suele tener 14–15.`;
  if (d.length > 15) return `Demasiados dígitos (${d.length}). IMEI son 14–15.`;
  if (d.length === 15 && !imeiValido(valor)) {
    return 'IMEI no pasa el dígito de control (Luhn). Revisa si hay un error de tipeo.';
  }
  return null;
}

export interface EquipoFormLike {
  modelo: string;
  monto: string;
  esRevision: boolean;
  tipoTrabajo: string;
  tipoTrabajoOtro: string;
  imeiSerie?: string;
}

// El aviso de IMEI (mensajeImeiInvalido) es SOLO informativo — el campo
// "IMEI o N° de Serie" también recibe números de serie que no son IMEI
// reales (a veces ni siquiera numéricos), así que un formato "raro" nunca
// debe bloquear guardar el trabajo. La UI (FormularioServicio) lo muestra
// aparte como advertencia junto al campo.
export function validarEquipo(eq: EquipoFormLike, esPrimero: boolean): string | null {
  if (!eq.modelo.trim() && !eq.monto.trim()) {
    return esPrimero ? 'Indica al menos el modelo del equipo.' : null;
  }
  if (!eq.modelo.trim()) return 'Cada equipo necesita el modelo.';
  if (!eq.esRevision && !eq.monto.trim()) {
    return 'Cada equipo necesita el monto (salvo que sea una revisión).';
  }
  if (eq.monto.trim()) {
    const n = parseFloat(eq.monto);
    if (isNaN(n) || n < 0) return 'Monto inválido.';
  }
  if (eq.tipoTrabajo === 'Otros' && !eq.tipoTrabajoOtro.trim()) {
    return 'Escribe el tipo de servicio en "Otros".';
  }
  return null;
}
