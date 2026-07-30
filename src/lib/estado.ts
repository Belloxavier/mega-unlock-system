// Estados de progreso de un trabajo. Siempre editable libremente (elegir de
// un menú, sin ciclos automáticos ni orden forzado).
export const ESTADOS_PROGRESO = ['PENDIENTE', 'EN PROCESO', 'PAUSADO', 'COMPLETADO', 'ENTREGADO'];

export const getDotColor = (estado: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-400';
    case 'EN PROCESO': return 'bg-cyan-400';
    case 'PAUSADO': return 'bg-violet-400';
    case 'COMPLETADO': return 'bg-blue-400';
    case 'ENTREGADO': return 'bg-emerald-400';
    case 'NO REALIZADO': return 'bg-rose-400';
    default: return 'bg-slate-400';
  }
};

export const getBadgeColor = (estado: string, createdAt?: string) => {
  if (estado === 'PENDIENTE' && createdAt) {
    const horas = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (horas < 1) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
    if (horas < 2) return 'bg-yellow-500/40 text-yellow-100 border-yellow-500/60';
    if (horas < 6) return 'bg-orange-500/60 text-orange-50 border-orange-500/70';
    if (horas < 24) return 'bg-orange-600 text-white border-orange-400 shadow-[0_0_8px_rgba(234,88,12,0.5)]';
    return 'bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.6)]';
  }
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'EN PROCESO': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'PAUSADO': return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
    case 'COMPLETADO': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'ENTREGADO': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'NO REALIZADO': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};
