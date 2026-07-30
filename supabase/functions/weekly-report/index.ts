// Reporte semanal de MEGA UNLOCK.
// Se ejecuta automáticamente (ver README.md de esta carpeta para el cron)
// y envía por correo un resumen de la semana: caja, ranking de clientes,
// tipo de trabajo más realizado y tiempo promedio de reparación.
//
// Variables de entorno requeridas (Supabase → Project Settings → Edge Functions → Secrets):
//   GMAIL_USER          -> cuenta de Gmail que envía el correo
//   GMAIL_APP_PASSWORD  -> "contraseña de aplicación" de esa cuenta (no la contraseña normal)
//   REPORT_RECIPIENTS   -> opcional, correos separados por coma. Por defecto usa los dos de abajo.
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const ZONA_HORARIA = 'America/Santiago';
const DEFAULT_RECIPIENTS = ['belloxavier22@gmail.com', 'moratinosandrea@gmail.com'];
const ENTALLER_ESTADOS = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO'];

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
const fmtFecha = (d: Date) => new Intl.DateTimeFormat('es-CL', { timeZone: ZONA_HORARIA, dateStyle: 'long' }).format(d);

// Nombres de cliente/tipo de trabajo son texto libre — se escapan antes de
// interpolarlos en el HTML del correo (mismo motivo que en el ticket impreso).
const escapeHtml = (valor: unknown) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

interface Servicio {
  id: string;
  modelo_equipo: string;
  tipo_trabajo: string;
  monto: number;
  estado: string;
  created_at: string;
  completado_at: string | null;
  clientes: { nombre: string; tipo_contacto?: string } | null;
}

function construirHtml(stats: {
  desde: Date;
  hasta: Date;
  cajaSemana: number;
  trabajosSemana: number;
  topTecnicos: { nombre: string; dinero: number; visitas: number }[];
  topClientes: { nombre: string; dinero: number; visitas: number }[];
  tiposTrabajo: { tipo: string; trabajos: number; dinero: number }[];
  tiempoPromedioHoras: number | null;
  atascados: number;
}) {
  const filaRanking = (r: { nombre: string; dinero: number; visitas: number }, idx: number) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #223;">#${idx + 1} ${escapeHtml(r.nombre)}</td><td style="padding:6px 10px;border-bottom:1px solid #223;text-align:right;">${r.visitas} trab.</td><td style="padding:6px 10px;border-bottom:1px solid #223;text-align:right;font-weight:bold;color:#22d3ee;">${fmtMoney(r.dinero)}</td></tr>`;

  const filaTipo = (t: { tipo: string; trabajos: number; dinero: number }, idx: number) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #223;">#${idx + 1} ${escapeHtml(t.tipo)}</td><td style="padding:6px 10px;border-bottom:1px solid #223;text-align:right;">${t.trabajos} eq.</td><td style="padding:6px 10px;border-bottom:1px solid #223;text-align:right;font-weight:bold;color:#818cf8;">${fmtMoney(t.dinero)}</td></tr>`;

  const mejorTecnico = stats.topTecnicos[0];
  const mejorCliente = stats.topClientes[0];

  return `
  <div style="font-family:Arial,sans-serif;background:#070B19;color:#e2e8f0;padding:24px;max-width:640px;margin:0 auto;">
    <h1 style="color:#22d3ee;font-size:20px;margin-bottom:0;">MEGA UNLOCK — Reporte Semanal</h1>
    <p style="color:#94a3b8;font-size:12px;margin-top:4px;">${fmtFecha(stats.desde)} al ${fmtFecha(stats.hasta)}</p>

    <div style="display:flex;gap:12px;margin:20px 0;">
      <div style="flex:1;background:#0f1730;border:1px solid #164e3a;border-radius:12px;padding:14px;">
        <p style="font-size:11px;color:#34d399;text-transform:uppercase;margin:0 0 6px;">Caja de la Semana</p>
        <p style="font-size:22px;font-weight:900;color:#6ee7b7;margin:0;">${fmtMoney(stats.cajaSemana)}</p>
      </div>
      <div style="flex:1;background:#0f1730;border:1px solid #1e3a5f;border-radius:12px;padding:14px;">
        <p style="font-size:11px;color:#60a5fa;text-transform:uppercase;margin:0 0 6px;">Trabajos</p>
        <p style="font-size:22px;font-weight:900;color:#93c5fd;margin:0;">${stats.trabajosSemana}</p>
      </div>
    </div>

    ${mejorTecnico || mejorCliente ? `
    <div style="background:#1c1408;border:1px solid #92400e;border-radius:12px;padding:14px;margin-bottom:20px;">
      <p style="font-size:11px;color:#fbbf24;text-transform:uppercase;margin:0 0 8px;">🏆 Incentivos de la semana</p>
      ${mejorTecnico ? `<p style="margin:2px 0;font-size:13px;">Mejor técnico: <b>${escapeHtml(mejorTecnico.nombre)}</b> (${fmtMoney(mejorTecnico.dinero)}, ${mejorTecnico.visitas} trabajos)</p>` : ''}
      ${mejorCliente ? `<p style="margin:2px 0;font-size:13px;">Mejor cliente: <b>${escapeHtml(mejorCliente.nombre)}</b> (${fmtMoney(mejorCliente.dinero)}, ${mejorCliente.visitas} trabajos)</p>` : ''}
    </div>` : ''}

    <h3 style="color:#22d3ee;font-size:13px;text-transform:uppercase;">💎 Top Técnicos</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">${stats.topTecnicos.map(filaRanking).join('') || '<tr><td style="padding:6px 10px;color:#64748b;">Sin datos</td></tr>'}</table>

    <h3 style="color:#22d3ee;font-size:13px;text-transform:uppercase;">👤 Top Clientes</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">${stats.topClientes.map(filaRanking).join('') || '<tr><td style="padding:6px 10px;color:#64748b;">Sin datos</td></tr>'}</table>

    <h3 style="color:#818cf8;font-size:13px;text-transform:uppercase;">🔧 Qué más hicimos</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">${stats.tiposTrabajo.map(filaTipo).join('') || '<tr><td style="padding:6px 10px;color:#64748b;">Sin datos</td></tr>'}</table>

    <div style="background:#0f1730;border:1px solid #334155;border-radius:12px;padding:14px;margin-bottom:16px;">
      <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin:0 0 6px;">⏱ Tiempo Promedio de Reparación</p>
      <p style="font-size:18px;font-weight:900;color:#e2e8f0;margin:0;">${stats.tiempoPromedioHoras !== null ? `${stats.tiempoPromedioHoras.toFixed(1)} horas` : 'Sin datos suficientes'}</p>
    </div>

    ${stats.atascados > 0 ? `<div style="background:#2a0f16;border:1px solid #9f1239;border-radius:12px;padding:14px;"><p style="color:#fda4af;font-size:13px;margin:0;">⚠️ Hay ${stats.atascados} trabajo(s) con más de 24h en el taller sin entregarse.</p></div>` : ''}

    <p style="color:#475569;font-size:11px;margin-top:24px;">Generado automáticamente por Mega Unlock Manager.</p>
  </div>`;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const gmailUser = Deno.env.get('GMAIL_USER')!;
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;
  const recipients = (Deno.env.get('REPORT_RECIPIENTS') || DEFAULT_RECIPIENTS.join(',')).split(',').map((s) => s.trim());

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const ahora = new Date();
  const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Las 3 consultas son independientes entre sí — se disparan en paralelo
  // en vez de una tras otra, para no sumar sus latencias de red.
  const [
    { data: serviciosSemana, error },
    { data: pagosSemana },
    { count: atascados },
  ] = await Promise.all([
    supabase
      .from('servicios')
      .select('id, modelo_equipo, tipo_trabajo, monto, estado, created_at, completado_at, clientes ( nombre, tipo_contacto )')
      .gte('created_at', hace7dias.toISOString()),
    // La caja se calcula por cuándo se COBRÓ (pagado_at), no por cuándo se
    // registró el trabajo: un trabajo de la semana pasada cobrado esta
    // semana cuenta para la caja de esta semana, y viceversa.
    supabase
      .from('servicios')
      .select('monto')
      .eq('pagado', true)
      .gte('pagado_at', hace7dias.toISOString())
      .lte('pagado_at', ahora.toISOString()),
    supabase
      .from('servicios')
      .select('id', { count: 'exact', head: true })
      .in('estado', ENTALLER_ESTADOS)
      .lt('created_at', new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const servicios = (serviciosSemana || []) as unknown as Servicio[];
  const cajaSemana = (pagosSemana || []).reduce((acc, s) => acc + (s.monto || 0), 0);

  const construirRanking = (tipo: 'tecnico' | 'cliente') => {
    const obj: { [key: string]: { nombre: string; dinero: number; visitas: number } } = {};
    servicios
      .filter((s) => (s.clientes?.tipo_contacto || 'tecnico') === tipo)
      .forEach((s) => {
        const nombre = s.clientes?.nombre?.trim() || 'General';
        const clave = nombre.toLowerCase();
        if (!obj[clave]) obj[clave] = { nombre, dinero: 0, visitas: 0 };
        obj[clave].dinero += s.monto || 0;
        obj[clave].visitas += 1;
      });
    return Object.values(obj).sort((a, b) => b.dinero - a.dinero).slice(0, 5);
  };

  const tipoObj: { [key: string]: { trabajos: number; dinero: number } } = {};
  servicios.forEach((s) => {
    const tipo = s.tipo_trabajo || 'General';
    if (!tipoObj[tipo]) tipoObj[tipo] = { trabajos: 0, dinero: 0 };
    tipoObj[tipo].trabajos += 1;
    tipoObj[tipo].dinero += s.monto || 0;
  });
  const tiposTrabajo = Object.entries(tipoObj)
    .map(([tipo, data]) => ({ tipo, ...data }))
    .sort((a, b) => b.trabajos - a.trabajos)
    .slice(0, 5);

  const horasReparacion = servicios
    .filter((s) => s.completado_at)
    .map((s) => (new Date(s.completado_at!).getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60));
  const tiempoPromedioHoras = horasReparacion.length > 0 ? horasReparacion.reduce((a, b) => a + b, 0) / horasReparacion.length : null;

  const html = construirHtml({
    desde: hace7dias,
    hasta: ahora,
    cajaSemana,
    trabajosSemana: servicios.length,
    topTecnicos: construirRanking('tecnico'),
    topClientes: construirRanking('cliente'),
    tiposTrabajo,
    tiempoPromedioHoras,
    atascados: atascados || 0,
  });

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: gmailUser, password: gmailAppPassword },
    },
  });

  await client.send({
    from: `Mega Unlock Manager <${gmailUser}>`,
    to: recipients,
    subject: `📊 Reporte semanal Mega Unlock — ${fmtFecha(ahora)}`,
    html,
  });
  await client.close();

  return new Response(JSON.stringify({ ok: true, enviados: recipients, trabajosSemana: servicios.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
