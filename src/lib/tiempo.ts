export function formatearDuracionMin(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto > 0 ? `${horas}h ${resto}m` : `${horas}h`;
}
