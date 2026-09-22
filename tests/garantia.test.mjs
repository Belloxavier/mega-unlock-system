import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function cargar(path, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, Intl, require: (n) => deps[n] });
  return exports;
}
const { calcularEstadoGarantia } = cargar('../src/lib/garantia.ts', { './date': { ZONA_HORARIA: 'America/Santiago' } });
const { equipoVacio } = cargar('../src/types.ts');
const { validarEquipo } = cargar('../src/lib/validacion.ts');

test('cada equipo nuevo comienza con tres meses y conserva estado independiente', () => {
  const uno = equipoVacio();
  const dos = equipoVacio();
  uno.garantiaMeses = 0;
  assert.equal(dos.garantiaMeses, 3);
});
test('acepta los cuatro plazos y rechaza valores ajenos', () => {
  const eq = { ...equipoVacio(), modelo: 'QA', monto: '100' };
  for (const garantiaMeses of [0,1,3,6]) assert.equal(validarEquipo({ ...eq, garantiaMeses }, true), null);
  for (const garantiaMeses of [-1,2,12,NaN]) assert.match(validarEquipo({ ...eq, garantiaMeses }, true), /garantía válida/);
});
test('vencida hace un minuto no sigue vigente por redondeo', () => {
  assert.equal(calcularEstadoGarantia(new Date(Date.now()-60000).toISOString()).vigente, false);
  assert.equal(calcularEstadoGarantia(new Date(Date.now()+60000).toISOString()).vigente, true);
});
test('sin fecha o fecha inválida no inventa vigencia', () => {
  assert.equal(calcularEstadoGarantia(null), null);
  assert.equal(calcularEstadoGarantia('incorrecta'), null);
});
