/**
 * Plantillas de WhatsApp editables (localStorage).
 * Claves estables para no romper si se renombra el copy por defecto.
 */

export type PlantillaKey =
  | 'equipoListo'
  | 'equipoListoRevision'
  | 'recordatorio24h'
  | 'garantiaResuelta';

const DEFAULTS: Record<PlantillaKey, string> = {
  equipoListo:
    'Hola {{nombre}}, tu equipo {{modelo}}{{folio}} ya está listo. El total a pagar es ${{monto}}. Puedes pasar a retirarlo.{{linkPago}}',
  equipoListoRevision:
    'Hola {{nombre}}, ya revisamos tu equipo {{modelo}}{{folio}}.\n\nDiagnóstico: {{diagnostico}}\nPrecio: ${{monto}}\n\nPuedes pasar a retirarlo.{{linkPago}}',
  recordatorio24h:
    'Hola {{nombre}} 👋, te escribimos de Mega Unlock para recordarte que tu equipo {{modelo}}{{folio}} sigue esperando por ti en el taller. Cuando puedas, pasa a retirarlo. ¡Saludos!',
  garantiaResuelta:
    'Hola {{nombre}}, tu garantía{{folio}} quedó resuelta. Cualquier cosa, avísanos.',
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
  folio?: string;
  monto?: string | number;
  diagnostico?: string;
  linkPago?: string;
}

export function renderPlantilla(key: PlantillaKey, vars: VarsPlantilla, custom?: string): string {
  let t = custom ?? getPlantillas()[key];
  const folioRef = vars.folio ? ` (folio ${vars.folio})` : '';
  const map: Record<string, string> = {
    '{{nombre}}': vars.nombre || '',
    '{{modelo}}': vars.modelo || '',
    '{{folio}}': folioRef,
    '{{monto}}': vars.monto !== undefined ? Number(vars.monto).toFixed(2) : '0.00',
    '{{diagnostico}}': vars.diagnostico || '',
    '{{linkPago}}': vars.linkPago || '',
  };
  for (const [k, v] of Object.entries(map)) {
    t = t.split(k).join(v);
  }
  return t;
}
