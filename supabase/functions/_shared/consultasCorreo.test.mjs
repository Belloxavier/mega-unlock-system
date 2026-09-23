import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { consultarCorreo, configuracionCorreo } from './consultasCorreo.ts';

const futuro = { error: { code: 'PGRST303', message: 'JWT issued at future' } };
test('recupera un rechazo temporal de cualquiera de las consultas', async () => {
  let llamadas = 0;
  const esperas = [];
  const resultado = await consultarCorreo(async () => {
    llamadas++;
    return [{ error: null }, llamadas < 3 ? futuro : { error: null }];
  }, async (ms) => { esperas.push(ms); });
  assert.equal(llamadas, 3);
  assert.deepEqual(esperas, [1000, 3000]);
  assert.equal(resultado[1].error, null);
});
test('limita los intentos y propaga fallo persistente', async () => {
  let llamadas = 0;
  await assert.rejects(consultarCorreo(async () => { llamadas++; return [futuro]; }, async () => {}), /PGRST303/);
  assert.equal(llamadas, 4);
});
test('no reintenta permisos ni otros JWT inválidos', async () => {
  for (const error of [{ code: '42501', message: 'permission denied' }, { code: 'PGRST303', message: 'JWT expired' }]) {
    let llamadas = 0;
    await assert.rejects(consultarCorreo(async () => { llamadas++; return [{ error }]; }, async () => assert.fail('No debe esperar')));
    assert.equal(llamadas, 1);
  }
});
test('rechaza configuración incompleta y destinatarios vacíos', () => {
  assert.throws(() => configuracionCorreo(() => undefined, ['a@example.com']), /SUPABASE_URL/);
  assert.throws(() => configuracionCorreo((n) => n === 'REPORT_RECIPIENTS' ? ' , ' : 'configurado', []), /destinatarios/);
});

// Ejecuta los handlers reales con límites externos simulados: no manda correos.
for (const nombre of ['weekly-report', 'alertas-pendientes']) {
  const fuente = fs.readFileSync(new URL(`../${nombre}/index.ts`, import.meta.url), 'utf8');
  const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  function entorno({ falloConsulta = false, falloSmtp = false, falloCierre = false } = {}) {
    let handler, enviados = 0, cerrados = 0, consultas = 0;
    const variables = { CRON_SHARED_SECRET: 'prueba', SUPABASE_URL: 'https://example.com', SUPABASE_SERVICE_ROLE_KEY: 'prueba', GMAIL_USER: 'a@example.com', GMAIL_APP_PASSWORD: 'prueba' };
    const client = { from() {
      const indice = consultas++;
      const resultado = falloConsulta && indice === 1 ? { error: { code: '42501', message: 'permission denied' }, data: null } : { error: null, data: [], count: 0 };
      const builder = { then(resolve) { return Promise.resolve(resultado).then(resolve); } };
      for (const method of ['select', 'eq', 'gte', 'lte', 'lt', 'in']) builder[method] = () => builder;
      return builder;
    } };
    class SMTPClient {
      async send() { enviados++; if (falloSmtp) throw new Error('SMTP rechazado'); }
      // Igual que denomailer 1.6.0 real: close() devuelve void, no una promesa.
      close() { cerrados++; if (falloCierre) throw new Error('Cierre rechazado'); }
    }
    class Fecha extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-22T01:00:00Z'])); } }
    vm.runInNewContext(js, {
      exports: {}, Response, URL, Date: Fecha, Intl, console: { info() {}, warn() {}, error() {} },
      Deno: { env: { get: (n) => variables[n] }, serve: (h) => { handler = h; } },
      require: (specifier) => specifier.includes('supabase-js') ? { createClient: () => client } : specifier.includes('denomailer') ? { SMTPClient } : { consultarCorreo, configuracionCorreo },
    });
    return { run: (query = '', autorizado = true) => handler(new Request(`https://example.com/${nombre}${query}`, { headers: autorizado ? { 'x-cron-secret': 'prueba' } : {} })), counts: () => ({ enviados, cerrados, consultas }) };
  }
  test(`${nombre}: diagnóstico autenticado consulta sin enviar`, async () => {
    const env = entorno();
    assert.equal((await env.run('?diagnostico=1', false)).status, 401);
    assert.equal(env.counts().consultas, 0);
    const response = await env.run('?diagnostico=1');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).enviado, false);
    assert.equal(env.counts().enviados, 0);
    assert.equal(env.counts().consultas, 3);
  });
  test(`${nombre}: falla la segunda consulta y nunca envía datos parciales`, async () => {
    const env = entorno({ falloConsulta: true });
    assert.equal((await env.run()).status, 500);
    assert.equal(env.counts().enviados, 0);
  });
  if (nombre === 'weekly-report') {
    test('SMTP fallido no se reintenta y siempre se cierra', async () => {
      const env = entorno({ falloSmtp: true });
      assert.equal((await env.run()).status, 500);
      assert.deepEqual(env.counts(), { enviados: 1, cerrados: 1, consultas: 3 });
    });
    test('fallo de cierre no oculta un envío aceptado', async () => {
      const env = entorno({ falloCierre: true });
      assert.equal((await env.run()).status, 200);
      assert.equal(env.counts().enviados, 1);
    });
  }
}
