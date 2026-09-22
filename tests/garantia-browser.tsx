// Fixture local para verificar el Dashboard real sin tocar Supabase.
// Vite solo compila index.html en producción; esta página no se distribuye.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';

const cliente = { id: 'qa-cliente', nombre: 'Prueba Garantia', telefono: '', tipo_contacto: 'tecnico' };
let servicios = [0, 1, 3, 6].map((meses, i) => ({
  id: `qa-${i}`, cliente_id: cliente.id, clientes: cliente, modelo_equipo: `Equipo ${meses} meses`,
  tipo_trabajo: 'FRP', monto: 10000, estado: 'ENTREGADO', pagado: true,
  created_at: new Date().toISOString(), entregado_at: new Date().toISOString(),
  garantia_meses: meses, garantia_vence_at: meses ? new Date(Date.now()+86400000*meses*30).toISOString() : null,
}));
servicios.push({ ...servicios[2], id: 'qa-sin-fecha', modelo_equipo: 'Histórico sin fecha', entregado_at: null, garantia_vence_at: null });
servicios.push({ ...servicios[2], id: 'qa-vencido', modelo_equipo: 'Garantía vencida', garantia_vence_at: new Date(Date.now()-60000).toISOString() });
const escrituras: { tabla: string; metodo: string; datos: unknown }[] = [];
Object.assign(window, { garantiaQA: { escrituras, servicios: () => servicios } });

const fetchOriginal = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
  if (url.hostname === location.hostname) return fetchOriginal(input, init);
  // Ninguna llamada externa del Dashboard de prueba llega a producción.
  const tabla = url.pathname.split('/').pop();
  const metodo = init?.method || 'GET';
  const datos = init?.body ? JSON.parse(String(init.body)) : null;
  const responder = (body: unknown, total = 0) => new Response(JSON.stringify(body), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': `0-${Math.max(0,total-1)}/${total}` },
  });
  if (metodo !== 'GET' && metodo !== 'HEAD') escrituras.push({ tabla, metodo, datos });
  if (tabla === 'asignar_folios') return responder(datos.p_prefijos.map((_: string, i: number) => `QA-${escrituras.length}-${i}`));
  if (tabla === 'clientes') return responder(url.searchParams.get('select') === 'id' ? [{ id: cliente.id }] : [cliente]);
  if (tabla === 'servicios') {
    if (metodo === 'POST') servicios.push(...datos.map((s: object, i: number) => ({ ...s, id: `nuevo-${escrituras.length}-${i}`, clientes: cliente, created_at: new Date().toISOString() })));
    if (metodo === 'PATCH') servicios = servicios.map((s) => `eq.${s.id}` === url.searchParams.get('id') ? { ...s, ...datos } : s);
    let filas = servicios;
    const estado = url.searchParams.get('estado');
    if (estado?.startsWith('eq.')) filas = filas.filter((s) => s.estado === estado.slice(3));
    return responder(filas, filas.length);
  }
  return responder([]);
};

const { Dashboard } = await import('../src/components/dashboard/Dashboard');
createRoot(document.getElementById('root')!).render(<React.StrictMode><Dashboard /></React.StrictMode>);
