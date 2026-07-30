// URLs oficiales de cada operadora para consultar el estado de un IMEI
// (Base de Datos Centralizada de Subtel / Multibanda-SAE). No hay API
// pública: son formularios pensados para uso manual, uno por uno.
// Verificadas contra el directorio oficial multibanda.cl (jul. 2026).
export const OPERADORAS_IMEI = [
  { nombre: 'Movistar', url: 'https://ww2.movistar.cl/terminos-regulaciones/multibanda-sae/', hex: '#019df4' },
  { nombre: 'Entel', url: 'https://www.entel.cl/nueva-normativa', hex: '#00b2a9' },
  { nombre: 'WOM', url: 'https://www.wom.cl/sello-multibandas/', hex: '#7b2ff7' },
  { nombre: 'Claro', url: 'https://www.clarochile.cl/personas/equipos/consulta-imei/', hex: '#e2001a' },
];

// El campo "IMEI o N° de Serie (S/N)" acepta cualquier texto (a veces hasta
// un teléfono, por error). Un IMEI real son 14-15 dígitos numéricos, así
// que solo eso entra a la lista de pendientes de verificar.
export const pareceImei = (valor?: string) => {
  if (!valor) return false;
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 14 || digitos.length === 15;
};

export const getImeiWarning = (estado?: string) => {
  switch (estado) {
    case 'reportado': return { icono: '⚠️', clase: 'text-red-400', texto: 'IMEI reportado' };
    case 'bloqueado': return { icono: '⚠️', clase: 'text-orange-400', texto: 'IMEI bloqueado' };
    case 'limpio': return { icono: '✅', clase: 'text-emerald-400', texto: 'IMEI limpio' };
    default: return null;
  }
};
