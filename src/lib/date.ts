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

// Offset horario de Chile (en minutos, ej. -240) en el instante `fecha` —
// cambia entre horario de verano/invierno, por eso se calcula en vez de
// asumir uno fijo.
const offsetChileMinutos = (fecha: Date): number => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA,
    timeZoneName: 'shortOffset',
  }).formatToParts(fecha);
  const tz = partes.find((p) => p.type === 'timeZoneName')?.value || 'GMT-4';
  const match = tz.match(/GMT([+-]\d+)/);
  return (match ? parseInt(match[1], 10) : -4) * 60;
};

// Instante UTC (ISO) que corresponde a las 00:00 hora de Chile del día que
// contiene `ref` — para filtrar created_at del lado del servidor con el
// mismo criterio de "hoy" que ya usa getFechaLocal. En el día exacto del
// cambio de horario puede desviarse hasta 1h (mismo límite ya aceptado en
// el resto del proyecto, ver weekly-report).
export const inicioDiaChileISO = (ref: Date = new Date()): string => {
  const [y, m, d] = getFechaLocal(ref).split('-').map(Number);
  const medianocheUtcIngenua = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const offset = offsetChileMinutos(medianocheUtcIngenua);
  return new Date(medianocheUtcIngenua.getTime() - offset * 60000).toISOString();
};

// Igual que inicioDiaChileISO pero del día SIGUIENTE — se usa como límite
// exclusivo (.lt) para evitar líos de milisegundos con "fin de día".
export const finDiaChileISOExclusivo = (ref: Date = new Date()): string => {
  const siguiente = new Date(ref);
  siguiente.setDate(siguiente.getDate() + 1);
  return inicioDiaChileISO(siguiente);
};

export const inicioMesChileISO = (ref: Date = new Date()): string => {
  const [y, m] = getFechaLocal(ref).split('-').map(Number);
  return inicioDiaChileISO(new Date(Date.UTC(y, m - 1, 1, 12)));
};

// Igual que inicioMesChileISO pero del mes SIGUIENTE — límite exclusivo (.lt).
export const finMesChileISOExclusivo = (ref: Date = new Date()): string => {
  const [y, m] = getFechaLocal(ref).split('-').map(Number);
  const siguienteMes = new Date(Date.UTC(y, m, 1, 12));
  return inicioDiaChileISO(siguienteMes);
};

// Desplaza un string "YYYY-MM" por `offset` meses (puede ser negativo).
export const sumarMeses = (mesStr: string, offset: number) => {
  const [y, m] = mesStr.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Desplaza un string "YYYY-MM-DD" por `dias` (puede ser negativo). Trabaja
// solo con los componentes de calendario (sin pasar por Date+ISO), así que
// no hay riesgo de que un huso horario desfase el día.
export const sumarDias = (fechaStr: string, dias: number): string => {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};
