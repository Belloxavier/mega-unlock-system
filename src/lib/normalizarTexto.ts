// Normaliza modelo/tipo de servicio (mayúsculas, espacios extra) para
// agrupar combinaciones equivalentes al buscar precios y tiempos
// históricos — "similar" en Fase 1 significa esto, no coincidencia
// aproximada por typos (eso queda para una fase futura si hace falta).
export const normalizarTexto = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Prefijos de marca/línea que se ignoran al normalizar el modelo — lista
// abierta, se puede ampliar sin romper nada (los registros ya guardados no
// se reinterpretan solos; solo el próximo guardado/edición recalcula
// modelo_normalizado con la lista vigente en ese momento).
const MARCAS_MODELO = [
  'xiaomi', 'redmi', 'samsung', 'galaxy', 'motorola', 'iphone', 'apple',
  'huawei', 'honor', 'realme', 'oppo', 'vivo', 'lg', 'nokia', 'sony',
  'google', 'pixel', 'oneplus', 'nothing', 'tecno', 'infinix',
];
const SET_MARCAS_MODELO = new Set(MARCAS_MODELO);

function limpiarModelo(valor: string): string {
  return valor
    .replace(/[^a-z0-9\s-]/g, ' ') // quita puntos, comas, paréntesis, etc.
    .replace(/-+/g, '-') // colapsa guiones repetidos
    .replace(/\s+/g, ' ') // colapsa espacios repetidos
    .trim()
    .replace(/^[\s-]+|[\s-]+$/g, '') // quita guiones/espacios sueltos al borde
    .trim();
}

/**
 * Normaliza el modelo de un equipo para que distintas formas de escribirlo
 * ("Xiaomi Redmi 14C", "redmi 14c", "14c") se agrupen igual en precio
 * sugerido, dificultad, carga del taller y rankings. modelo_equipo (lo que
 * escribió el usuario) nunca se toca — esto solo alimenta
 * modelo_normalizado. Determinista: mismo texto de entrada, siempre el
 * mismo resultado. Es idempotente (normalizar algo ya normalizado da lo
 * mismo), así que es seguro pasarle tanto texto libre recién escrito como
 * un modelo_normalizado ya guardado.
 */
export function normalizarModelo(modeloOriginal: string): string {
  const original = (modeloOriginal || '').toLowerCase().trim();
  const base = limpiarModelo(original);
  // Si el modelo es puro emoji/símbolos ("🔥🔥🔥"), limpiarModelo lo deja
  // vacío — devolver '' acá agruparía TODOS los modelos "raros" entre sí
  // como si fueran el mismo equipo. Mejor conservar el texto original (ya
  // en minúsculas) que perder la distinción.
  if (!base) return original;
  const tokens = base.split(' ').filter(Boolean);
  let i = 0;
  // Nunca se quita el último token que queda — si alguien escribe solo
  // "Samsung" (sin modelo), preferimos guardar "samsung" a quedarnos con
  // un modelo_normalizado vacío que agruparía con cualquier otra cosa.
  while (i < tokens.length - 1 && SET_MARCAS_MODELO.has(tokens[i])) {
    i++;
  }
  return tokens.slice(i).join(' ');
}

export const claveCombo = (modelo: string, tipoTrabajo: string) =>
  `${normalizarModelo(modelo)}|${normalizarTexto(tipoTrabajo)}`;
