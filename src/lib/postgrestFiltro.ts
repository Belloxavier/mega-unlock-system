/**
 * Escapes para construir filtros de PostgREST (Supabase) a mano de forma
 * segura.
 */

// Para el VALOR de una condición dentro de un .or()/.and() crudo
// ('col.ilike.valor,...'). Verificado contra la base real: una coma sin
// envolver rompe la consulta completa con un error 400 ("failed to parse
// logic tree") — y escaparla con backslash (\,) NO funciona, sigue
// rompiendo el parser (PostgREST no soporta ese escape ahí, a pesar de que
// la documentación de otros filtros sugiere que sí). Lo que sí funciona,
// confirmado con pruebas reales, es envolver el valor completo entre
// comillas dobles — ahí adentro coma/punto/paréntesis no necesitan ningún
// escape. Solo hay que escapar comillas dobles y backslash del propio
// texto para no cerrar la comilla antes de tiempo.
export function envolverValorOr(valor: string): string {
  const escapado = valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapado}"`;
}

// Para valores usados como argumento de .ilike()/.like() directo (no dentro
// de un .or() crudo) — % y _ son comodines de ILIKE en Postgres. Esto SÍ es
// seguro con backslash porque no pasa por el parser de árbol lógico de
// .or()/.and(), solo por un filtro simple de columna.
export function escaparComodinesLike(valor: string): string {
  return valor.replace(/([\\%_])/g, '\\$1');
}
