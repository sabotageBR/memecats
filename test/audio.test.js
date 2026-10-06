// Nota sem fim do combo (tom de Shepard): o ciclo fecha, sobe a cada passo e
// as pontas entram e saem mudas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notaSemFim } from '../src/core/audio.js';

/** semitom (0 a 11) da nota, pela parcial mais forte */
const semitom = (/** @type {[number, number][]} */ nota) => {
  const [hz] = nota.reduce((a, b) => (b[1] > a[1] ? b : a));
  return Math.round(((Math.log2(hz / 82.5) % 1) + 1) % 1 * 12) % 12;
};

test('a nota k + 7 e a mesma nota k (a subida nao tem fim)', () => {
  for (let k = 1; k <= 30; k++) assert.deepEqual(notaSemFim(k + 7), notaSemFim(k), `k=${k}`);
});

test('cada acerto sobe um grau da escala maior', () => {
  const graus = [1, 2, 3, 4, 5, 6, 7].map((k) => semitom(notaSemFim(k)));
  assert.deepEqual(graus, [0, 2, 4, 5, 7, 9, 11]);
});

test('todas as parciais sao oitavas da mesma nota', () => {
  for (let k = 1; k <= 7; k++) {
    const nota = notaSemFim(k);
    assert.equal(nota.length, 7);
    for (let i = 1; i < nota.length; i++) assert.ok(Math.abs(nota[i][0] / nota[i - 1][0] - 2) < 1e-9, `k=${k} i=${i}`);
  }
});

test('o som fica no meio: as pontas pesam quase nada e o forte esta entre 300 Hz e 1,6 kHz', () => {
  for (let k = 1; k <= 7; k++) {
    const nota = notaSemFim(k);
    assert.ok(nota[0][1] < 0.15 && nota[nota.length - 1][1] < 0.02, `k=${k}`);
    for (const [hz, p] of nota) if (p > 0.5) assert.ok(hz > 300 && hz < 1600, `k=${k} ${hz} Hz`);
  }
  // a nota 1 tem o centro em 660 Hz, como o travar antigo
  assert.equal(notaSemFim(1)[3][0], 660);
  assert.equal(notaSemFim(1)[3][1], 1);
});

test('a volta (do 7o grau para o 8o) nao tem emenda: o que entra e o que sai sao mudos', () => {
  // do grau 7 para o 8 a escala sobe meio tom; a parcial que sai por cima e a
  // que entra por baixo valem menos de 2% da mais forte
  const g7 = notaSemFim(7);
  const g8 = notaSemFim(8);
  assert.ok(g7[g7.length - 1][1] < 0.02);
  assert.ok(g8[0][1] < 0.02);
});
