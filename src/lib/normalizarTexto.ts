// Normaliza modelo/tipo de servicio (mayúsculas, espacios extra) para
// agrupar combinaciones equivalentes al buscar precios y tiempos
// históricos — "similar" en Fase 1 significa esto, no coincidencia
// aproximada por typos (eso queda para una fase futura si hace falta).
export const normalizarTexto = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const claveCombo = (modelo: string, tipoTrabajo: string) =>
  `${normalizarTexto(modelo)}|${normalizarTexto(tipoTrabajo)}`;
