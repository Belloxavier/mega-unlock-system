// Supabase/PostgREST corta cualquier SELECT en `max_rows` (1.000 en este
// proyecto) aunque no se pida .range() — sin aviso ni error, solo llegan
// menos filas. Para las listas que de verdad necesitan la tabla completa
// (Finanzas, Caja, Por Cobrar, Reporte Mensual, Estadísticas, Garantías) se
// pide en bloques de TAMANO_BLOQUE hasta que un bloque llegue incompleto.
//
// `consultarBloque` DEBE aplicar un orden estable y único (ej. created_at
// desc + id) — si dos filas comparten created_at y el orden no las
// desempata, Postgres puede devolverlas en distinto orden entre bloques y
// una fila se duplicaría o se saltaría en el borde entre dos bloques.
export const TAMANO_BLOQUE = 1000;

type RespuestaBloque<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function traerTodoEnBloques<T>(
  consultarBloque: (desde: number, hasta: number) => RespuestaBloque<T>,
  /** Se consulta antes de pedir cada bloque: si devuelve true, se aborta (ej. ya hay un fetch más nuevo). */
  cancelado?: () => boolean
): Promise<{ data: T[]; error: string | null; cancelado: boolean }> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAMANO_BLOQUE) {
    if (cancelado?.()) return { data: filas, error: null, cancelado: true };
    const { data, error } = await consultarBloque(desde, desde + TAMANO_BLOQUE - 1);
    if (error) return { data: filas, error: error.message, cancelado: false };
    const bloque = data || [];
    filas.push(...bloque);
    if (bloque.length < TAMANO_BLOQUE) return { data: filas, error: null, cancelado: false };
  }
}
