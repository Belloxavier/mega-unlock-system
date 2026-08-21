import { useCallback, useRef, useState } from 'react';
import { supabase } from '../supabase';
import type { Servicio } from '../types';
import { finDiaChileISOExclusivo, finMesChileISOExclusivo, inicioDiaChileISO, inicioMesChileISO } from '../lib/date';
import { envolverValorOr } from '../lib/postgrestFiltro';

const SELECT_SERVICIO = `*, clientes ( id, nombre, telefono, tipo_contacto )`;

export interface FiltrosServiciosPagina {
  page: number;
  pageSize: number;
  search?: string;
  filtroFecha?: string; // 'todos' | 'hoy' | 'mes'
  filtroEstado?: string; // 'todos' | uno de ESTADOS_PROGRESO/NO REALIZADO
  filtroPagado?: 'todos' | 'pagado' | 'sin_pagar';
  /** 'desc' (más nuevo primero, default — Historial) o 'asc' (más antiguo primero — Área de Trabajo, para atender primero al que lleva más tiempo esperando). */
  orden?: 'asc' | 'desc';
}

// Centraliza el estado + fetch de `servicios`. Hay DOS fuentes de datos
// intencionalmente separadas:
//
// 1. `servicios` / `fetchServicios()` — la tabla COMPLETA, sin paginar.
//    Sigue existiendo porque Finanzas, el aprendizaje de precio, los avisos
//    de trabajos atascados/fiados y el reporte imprimible todavía calculan
//    todo en el cliente — mover eso a agregados en el servidor es la fase
//    siguiente, no esta.
// 2. `serviciosPagina` / `fetchServiciosPagina()` — SOLO la página visible
//    del Historial/Área de Trabajo, con búsqueda y filtros resueltos en el
//    servidor (.range/.ilike/.eq) en vez de traer todo para filtrar en JS.
export function useServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Evita que una respuesta VIEJA (llegada tarde por red lenta) pise datos
  // más nuevos si fetchServicios se llama de nuevo antes de que la llamada
  // anterior termine (ej. dos mutaciones seguidas rápido).
  const idFetchRef = useRef(0);

  const fetchServicios = useCallback(async () => {
    const miId = ++idFetchRef.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select(SELECT_SERVICIO)
        .order('created_at', { ascending: false });

      if (miId !== idFetchRef.current) return; // ya hay una llamada más nueva en curso/resuelta

      if (error) {
        setError(error.message);
      } else {
        setError(null);
        setServicios(data || []);
      }
    } catch (err) {
      if (miId !== idFetchRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (miId === idFetchRef.current) setLoading(false);
    }
  }, []);

  const [serviciosPagina, setServiciosPagina] = useState<Servicio[]>([]);
  const [totalServiciosPagina, setTotalServiciosPagina] = useState(0);
  const [loadingPagina, setLoadingPagina] = useState(false);
  const [errorPagina, setErrorPagina] = useState<string | null>(null);

  // Mismo motivo que idFetchRef: si el usuario cambia de página/filtro/
  // búsqueda mientras una consulta anterior todavía viaja por la red, la
  // respuesta vieja no debe pisar la de la consulta más nueva.
  const idPaginaRef = useRef(0);

  const fetchServiciosPagina = useCallback(async (filtros: FiltrosServiciosPagina) => {
    const miId = ++idPaginaRef.current;
    setLoadingPagina(true);

    try {
      let query = supabase.from('servicios').select(SELECT_SERVICIO, { count: 'exact' });

      const termino = filtros.search?.trim();
      if (termino) {
        const patron = envolverValorOr(`%${termino}%`);
        const condiciones = [
          `modelo_equipo.ilike.${patron}`,
          `imei_serie.ilike.${patron}`,
          `folio.ilike.${patron}`,
          `tipo_trabajo.ilike.${patron}`,
        ];
        // El nombre/teléfono del cliente viven en otra tabla — PostgREST no
        // permite mezclar columnas propias y de una tabla referenciada en un
        // mismo .or(), así que se resuelven los IDs de clientes que calzan
        // primero y se agregan como "cliente_id.in.(...)" a las condiciones.
        const { data: clientesCoincidentes } = await supabase
          .from('clientes')
          .select('id')
          .or(`nombre.ilike.${patron},telefono.ilike.${patron}`)
          .limit(50);

        if (miId !== idPaginaRef.current) return; // ya se pidió otra página/filtro mientras tanto

        if (clientesCoincidentes && clientesCoincidentes.length > 0) {
          condiciones.push(`cliente_id.in.(${clientesCoincidentes.map((c) => c.id).join(',')})`);
        }
        query = query.or(condiciones.join(','));
      }

      if (filtros.filtroFecha === 'hoy') {
        query = query.gte('created_at', inicioDiaChileISO()).lt('created_at', finDiaChileISOExclusivo());
      } else if (filtros.filtroFecha === 'mes') {
        query = query.gte('created_at', inicioMesChileISO()).lt('created_at', finMesChileISOExclusivo());
      }

      if (filtros.filtroEstado === 'activos') {
        // Valor virtual usado por Área de Trabajo: PENDIENTE + EN PROCESO, no un estado real de la tabla.
        query = query.in('estado', ['PENDIENTE', 'EN PROCESO']);
      } else if (filtros.filtroEstado && filtros.filtroEstado !== 'todos') {
        query = query.eq('estado', filtros.filtroEstado);
      }
      if (filtros.filtroPagado === 'pagado') query = query.eq('pagado', true);
      if (filtros.filtroPagado === 'sin_pagar') query = query.eq('pagado', false);

      const desde = (filtros.page - 1) * filtros.pageSize;
      const hasta = desde + filtros.pageSize - 1;
      const { data, error, count } = await query
        .order('created_at', { ascending: filtros.orden === 'asc' })
        .range(desde, hasta);

      if (miId !== idPaginaRef.current) return; // idem — respuesta vieja, se descarta

      if (error) {
        setErrorPagina(error.message);
      } else {
        setErrorPagina(null);
        setServiciosPagina(data || []);
        setTotalServiciosPagina(count ?? 0);
      }
    } catch (err) {
      if (miId !== idPaginaRef.current) return;
      setErrorPagina(err instanceof Error ? err.message : String(err));
    } finally {
      if (miId === idPaginaRef.current) setLoadingPagina(false);
    }
  }, []);

  return {
    servicios,
    loading,
    error,
    fetchServicios,
    serviciosPagina,
    totalServiciosPagina,
    loadingPagina,
    errorPagina,
    fetchServiciosPagina,
  };
}
