export const ZONA_HORARIA = 'America/Santiago';
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Devuelve la fecha en formato YYYY-MM-DD según la hora LOCAL de Chile,
// en vez de usar toISOString() que trabaja en UTC y desfasa el "Hoy".
export const getFechaLocal = (fecha: Date | string) => {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(d);
};

// Nombre del día de la semana (Lunes, Martes...) según la hora LOCAL de Chile.
export const getDiaSemana = (fecha: Date | string) => {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const nombre = new Intl.DateTimeFormat('es-CL', { timeZone: ZONA_HORARIA, weekday: 'long' }).format(d);
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
};

// Fecha corta y legible para mensajes al usuario, ej. "lunes 27/07".
export const getFechaCorta = (fecha: Date | string) => {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const dia = getDiaSemana(d).toLowerCase();
  const diaMes = new Intl.DateTimeFormat('es-CL', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
  }).format(d);
  return `${dia} ${diaMes}`;
};

// Desplaza un string "YYYY-MM" por `offset` meses (puede ser negativo).
export const sumarMeses = (mesStr: string, offset: number) => {
  const [y, m] = mesStr.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
