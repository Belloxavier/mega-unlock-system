import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFIJOS_FOLIO, TIPOS_ESTANDAR, getPrefijo } from '../src/lib/folio.ts';

test('los prefijos de folio son solo letras (un dígito haría chocar folios: I2+1 = I21)', () => {
  for (const [tipo, prefijo] of Object.entries(PREFIJOS_FOLIO)) {
    assert.match(prefijo, /^[A-Z]+$/, `${tipo} → '${prefijo}'`);
  }
});

test('no hay dos tipos con el mismo prefijo', () => {
  const prefijos = Object.values(PREFIJOS_FOLIO);
  assert.equal(new Set(prefijos).size, prefijos.length);
});

test('cada tipo estándar tiene prefijo propio y Activación IMEI 2 usa AX', () => {
  for (const tipo of TIPOS_ESTANDAR) assert.notEqual(getPrefijo(tipo), 'O', tipo);
  assert.equal(getPrefijo('Activación IMEI 2 Xiaomi'), 'AX');
});
