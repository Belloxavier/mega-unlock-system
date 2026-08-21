/**
 * Plantillas de WhatsApp editables (localStorage).
 * Claves estables para no romper si se renombra el copy por defecto.
 */

import { formatearNumero } from './moneda';

export type PlantillaKey =
  | 'equipoListo'
  | 'equiposListos'
  | 'equipoListoRevision'
  | 'recordatorio24h'
  | 'garantiaResuelta';

const DEFAULTS: Record<PlantillaKey, string> = {
  // Sin saludo con nombre a propósito: el nombre guardado en el cliente a
  // veces lleva una nota interna para diferenciar clientes con el mismo
  // nombre real (ej. "Oscar trabajador de Clíder") y no debe filtrarse al
  // WhatsApp del cliente. Tampoco lleva el monto — cuando un mismo cliente
  // deja varios equipos a la vez, mostrar el monto de uno solo confundía
  // (¿es el total o solo de ese equipo?); el monto se coordina al retirar.
  equipoListo:
    'Hola, tu equipo {{modelo}}{{folio}} ya está listo. Puedes pasar a retirarlo.{{linkPago}}',
  // Para cuando un mismo cliente tiene 2+ equipos Completados sin avisar
  // todavía (se juntan en un solo mensaje en vez de mandar uno por folio).
  // Sin folio ni monto por equipo a propósito, mismo criterio que
  // equipoListo — se coordina al retirar.
  equiposListos:
    'Hola, tus equipos {{modelos}} ya están listos. Puedes pasar a retirarlos.{{linkPago}}',
  equipoListoRevision:
    'Hola, ya revisamos tu equipo {{modelo}}{{folio}}.\n\nDiagnóstico: {{diagnostico}}\n\nPuedes pasar a retirarlo.{{linkPago}}',
  recordatorio24h:
    'Hola 👋, te escribimos de Mega Unlock para recordarte que tu equipo {{modelo}}{{folio}} sigue esperando por ti en el taller. Cuando puedas, pasa a retirarlo. ¡Saludos!',
  garantiaResuelta:
    'Hola, tu garantía{{folio}} quedó resuelta. Cualquier cosa, avísanos.',
};

const STORAGE_KEY = 'mega-unlock-wa-plantillas';

export function getPlantillas(): Record<PlantillaKey, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Record<PlantillaKey, string>>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setPlantilla(key: PlantillaKey, texto: string): void {
  const actual = getPlantillas();
  actual[key] = texto;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actual));
}

export function resetPlantillas(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface VarsPlantilla {
  nombre?: string;
  modelo?: string;
  /** Lista de modelos ya unida en texto (ej. "iPhone 12, Samsung A15 y Xiaomi Redmi 9") — solo para equiposListos. */
  modelos?: string;
  folio?: string;
  monto?: string | number;
  diagnostico?: string;
  linkPago?: string;
}

// "iPhone 12" / "iPhone 12 y Samsung A15" / "iPhone 12, Samsung A15 y Xiaomi Redmi 9" — para el mensaje consolidado (equiposListos).
export function unirModelos(modelos: string[]): string {
  if (modelos.length === 0) return '';
  if (modelos.length === 1) return modelos[0];
  return `${modelos.slice(0, -1).join(', ')} y ${modelos[modelos.length - 1]}`;
}

export function renderPlantilla(key: PlantillaKey, vars: VarsPlantilla, custom?: string): string {
  let t = custom ?? getPlantillas()[key];
  const folioRef = vars.folio ? ` (folio ${vars.folio})` : '';
  const map: Record<string, string> = {
    '{{nombre}}': vars.nombre || '',
    '{{modelo}}': vars.modelo || '',
    '{{modelos}}': vars.modelos || '',
    '{{folio}}': folioRef,
    '{{monto}}': vars.monto !== undefined ? formatearNumero(Number(vars.monto)) : '0',
    '{{diagnostico}}': vars.diagnostico || '',
    '{{linkPago}}': vars.linkPago || '',
  };
  for (const [k, v] of Object.entries(map)) {
    t = t.split(k).join(v);
  }
  return t;
}
