type ResultadoConsulta = {
  error: { message: string; code?: string } | null;
};

// Solo lecturas: nunca envolver SMTP ni escrituras con este reintento.
// El SDK no reintenta el 401 PGRST303 de un reloj temporalmente desfasado.
export async function consultarCorreo<T extends readonly ResultadoConsulta[]>(
  consultar: () => Promise<T>,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  const demoras = [1000, 3000, 7000];
  for (let intento = 0; ; intento++) {
    const resultados = await consultar();
    const errores = resultados.flatMap((r) => r.error ? [r.error] : []);
    if (errores.length === 0) return resultados;
    const temporales = errores.every((e) =>
      e.code === 'PGRST303' && e.message.includes('JWT issued at future')
    );
    if (!temporales || intento >= demoras.length) {
      throw new Error(`Consulta de reporte fallida: ${errores.map((e) => `${e.code || 'sin código'}: ${e.message}`).join('; ')}`);
    }
    console.warn(JSON.stringify({ evento: 'correo_consulta_reintento', intento: intento + 1, codigo: 'PGRST303' }));
    await esperar(demoras[intento]);
  }
}

export function configuracionCorreo(
  obtener: (nombre: string) => string | undefined,
  predeterminados: string[],
) {
  const requerido = (nombre: string) => {
    const valor = obtener(nombre)?.trim();
    if (!valor) throw new Error(`Falta configurar ${nombre}`);
    return valor;
  };
  const recipients = (obtener('REPORT_RECIPIENTS') ?? predeterminados.join(','))
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (!recipients.length || recipients.some((s) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))) {
    throw new Error('REPORT_RECIPIENTS no contiene destinatarios válidos');
  }
  return {
    supabaseUrl: requerido('SUPABASE_URL'),
    serviceRoleKey: requerido('SUPABASE_SERVICE_ROLE_KEY'),
    gmailUser: requerido('GMAIL_USER'),
    gmailAppPassword: requerido('GMAIL_APP_PASSWORD'),
    recipients,
  };
}
