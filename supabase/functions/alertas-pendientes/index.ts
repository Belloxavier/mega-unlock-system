// Alerta diaria de MEGA UNLOCK: revisa qué lleva más de 48 horas sin
// resolverse y avisa por correo con nombre de cliente y folio, para no
// perder el hilo del negocio. Se ejecuta automáticamente (ver cron en
// supabase/migrations/0006_schedule_alertas_pendientes.sql) y solo envía
// correo si de verdad hay algo pendiente.
//
// Usa los mismos secretos que weekly-report (GMAIL_USER, GMAIL_APP_PASSWORD,
// REPORT_RECIPIENTS) — no hace falta configurar nada nuevo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const ZONA_HORARIA = 'America/Santiago';
const DEFAULT_RECIPIENTS = ['belloxavier22@gmail.com', 'moratinosandrea@gmail.com'];
const HORAS_LIMITE = 48;

const fmtFecha = (d: Date) => new Intl.DateTimeFormat('es-CL', { timeZone: ZONA_HORARIA, dateStyle: 'long' }).format(d);

const fmtTranscurrido = (desde: string, ahora: Date) => {
  const horas = (ahora.getTime() - new Date(desde).getTime()) / (1000 * 60 * 60);
  const dias = Math.floor(horas / 24);
  return dias >= 1 ? `${dias} día${dias > 1 ? 's' : ''}` : `${Math.floor(horas)}h`;
};

interface ServicioAlerta {
  folio: string;
  modelo_equipo: string;
  created_at: string;
  completado_at: string | null;
  clientes: { nombre: string } | null;
}

interface GarantiaAlerta {
  folio: string;
  descripcion: string;
  created_at: string;
  servicios: { clientes: { nombre: string } | null } | null;
}

function construirHtml(stats: {
  ahora: Date;
  completadosSinCobrar: ServicioAlerta[];
  pendientesSinEmpezar: ServicioAlerta[];
  garantiasSinResolver: GarantiaAlerta[];
}) {
  const { ahora } = stats;

  const filaCompletado = (s: ServicioAlerta) =>
    `<li style="margin-bottom:6px;"><b>${s.clientes?.nombre || 'Cliente desconocido'}</b> lleva ${fmtTranscurrido(s.completado_at || s.created_at, ahora)} con <span style="font-family:monospace;">${s.folio}</span> (${s.modelo_equipo}) listo, sin pagar ni retirar.</li>`;

  const filaPendiente = (s: ServicioAlerta) =>
    `<li style="margin-bottom:6px;"><b>${s.clientes?.nombre || 'Cliente desconocido'}</b> lleva ${fmtTranscurrido(s.created_at, ahora)} con <span style="font-family:monospace;">${s.folio}</span> (${s.modelo_equipo}) sin ni siquiera empezar.</li>`;

  const filaGarantia = (g: GarantiaAlerta) =>
    `<li style="margin-bottom:6px;"><b>${g.servicios?.clientes?.nombre || 'Cliente desconocido'}</b> tiene una garantía sin resolver hace ${fmtTranscurrido(g.created_at, ahora)}: <span style="font-family:monospace;">${g.folio}</span> — ${g.descripcion}</li>`;

  return `
  <div style="font-family:Arial,sans-serif;background:#070B19;color:#e2e8f0;padding:24px;max-width:640px;margin:0 auto;">
    <h1 style="color:#f59e0b;font-size:20px;margin-bottom:0;">⚠️ MEGA UNLOCK — Pendientes de más de ${HORAS_LIMITE}h</h1>
    <p style="color:#94a3b8;font-size:12px;margin-top:4px;">${fmtFecha(ahora)}</p>

    ${stats.completadosSinCobrar.length > 0 ? `
    <h3 style="color:#f59e0b;font-size:13px;text-transform:uppercase;margin-top:20px;">📦 Listos, sin cobrar ni retirar</h3>
    <ul style="font-size:13px;padding-left:20px;margin:8px 0;">${stats.completadosSinCobrar.map(filaCompletado).join('')}</ul>` : ''}

    ${stats.pendientesSinEmpezar.length > 0 ? `
    <h3 style="color:#facc15;font-size:13px;text-transform:uppercase;margin-top:20px;">⏳ Sin empezar todavía</h3>
    <ul style="font-size:13px;padding-left:20px;margin:8px 0;">${stats.pendientesSinEmpezar.map(filaPendiente).join('')}</ul>` : ''}

    ${stats.garantiasSinResolver.length > 0 ? `
    <h3 style="color:#fb7185;font-size:13px;text-transform:uppercase;margin-top:20px;">🛡️ Garantías sin resolver</h3>
    <ul style="font-size:13px;padding-left:20px;margin:8px 0;">${stats.garantiasSinResolver.map(filaGarantia).join('')}</ul>` : ''}

    <p style="color:#475569;font-size:11px;margin-top:24px;">Generado automáticamente por Mega Unlock Manager. No se envía si no hay nada pendiente.</p>
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
  const hace48h = new Date(ahora.getTime() - HORAS_LIMITE * 60 * 60 * 1000).toISOString();

  const { data: completadosSinCobrar, error: e1 } = await supabase
    .from('servicios')
    .select('folio, modelo_equipo, created_at, completado_at, clientes ( nombre )')
    .eq('estado', 'COMPLETADO')
    .eq('pagado', false)
    .lt('completado_at', hace48h);

  const { data: pendientesSinEmpezar, error: e2 } = await supabase
    .from('servicios')
    .select('folio, modelo_equipo, created_at, completado_at, clientes ( nombre )')
    .eq('estado', 'PENDIENTE')
    .lt('created_at', hace48h);

  const { data: garantiasSinResolver, error: e3 } = await supabase
    .from('garantias')
    .select('folio, descripcion, created_at, servicios ( clientes ( nombre ) )')
    .eq('resuelta', false)
    .lt('created_at', hace48h);

  const error = e1 || e2 || e3;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const stats = {
    ahora,
    completadosSinCobrar: (completadosSinCobrar || []) as unknown as ServicioAlerta[],
    pendientesSinEmpezar: (pendientesSinEmpezar || []) as unknown as ServicioAlerta[],
    garantiasSinResolver: (garantiasSinResolver || []) as unknown as GarantiaAlerta[],
  };

  const total = stats.completadosSinCobrar.length + stats.pendientesSinEmpezar.length + stats.garantiasSinResolver.length;

  if (total === 0) {
    return new Response(JSON.stringify({ ok: true, enviado: false, motivo: 'Sin pendientes' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const html = construirHtml(stats);

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
    subject: `⚠️ Mega Unlock — ${total} pendiente(s) de más de ${HORAS_LIMITE}h`,
    html,
  });
  await client.close();

  return new Response(JSON.stringify({ ok: true, enviado: true, total, enviados: recipients }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
