// Curva de grade e catalogo dos gatos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, gradeParaImagem, CURVA, sementeDoNivel } from '../src/jogo/curva.js';
import { CATALOGO, REACOES, RARIDADES, gatoDoNivel, gatoPorId } from '../src/jogo/catalogo.js';

test('curva: 2x2 no tutorial, nunca diminui ate o ultimo gato e nunca passa de 6x6', () => {
  assert.deepEqual(grade(1), { cols: 2, lins: 2 });
  assert.deepEqual(grade(2), { cols: 3, lins: 3 });
  let antes = 0;
  for (let n = 1; n <= CATALOGO.length; n++) {
    const { cols, lins } = grade(n);
    assert.ok(cols * lins >= antes, `nivel ${n}`);
    antes = cols * lins;
  }
  for (let n = 1; n <= 200; n++) {
    const { cols, lins } = grade(n);
    assert.ok(cols >= 2 && lins >= 2 && cols <= 6 && lins <= 6, `nivel ${n}`);
  }
  assert.equal(CURVA[CURVA.length - 1][0], CATALOGO.length);
});

test('grade para imagem: na quadrada e a curva; na retangular, pecas mais quadradas e numero perto da curva', () => {
  for (let n = 1; n <= 80; n++) assert.deepEqual(gradeParaImagem(n, 1), grade(n), `nivel ${n}`);
  /** quanto a peca foge do quadrado @param {number} prop @param {number} c @param {number} l */
  const torta = (prop, c, l) => Math.abs(Math.log((prop * l) / c));
  for (const prop of [1.25, 1.33, 1.5, 1.78, 1.88, 0.75, 0.56]) {
    for (let n = 1; n <= 60; n++) {
      const { cols, lins } = gradeParaImagem(n, prop);
      const base = grade(n);
      const alvo = base.cols * base.lins;
      assert.ok(cols >= 2 && lins >= 2 && cols <= 8 && lins <= 8, `${prop} nivel ${n}`);
      assert.ok(Math.abs(cols * lins - alvo) / alvo <= 0.35, `${prop} nivel ${n}: ${cols}x${lins} contra ${alvo}`);
      assert.ok(torta(prop, cols, lins) <= torta(prop, base.cols, base.lins) + 1e-9, `${prop} nivel ${n}`);
    }
  }
  assert.deepEqual(gradeParaImagem(4, 16 / 9), { cols: 4, lins: 3 });
  assert.deepEqual(gradeParaImagem(1, 0), grade(1));
});

test('semente por nivel e estavel e distinta', () => {
  assert.equal(sementeDoNivel(7), sementeDoNivel(7));
  const vistas = new Set(Array.from({ length: 300 }, (_, i) => sementeDoNivel(i + 1)));
  assert.equal(vistas.size, 300);
});

test('catalogo: 41 gatos com id unico, nomes nos 3 idiomas, reacao e raridade validas', () => {
  assert.equal(CATALOGO.length, 41);
  const ids = new Set();
  for (const g of CATALOGO) {
    assert.match(g.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(g.id), g.id);
    ids.add(g.id);
    for (const l of ['en', 'pt', 'es']) assert.ok(g.nome[l] && g.nome[l].length <= 22, `${g.id} ${l}`);
    assert.ok(REACOES.includes(g.reacao), g.id);
    assert.ok(RARIDADES.includes(g.raridade), g.id);
    assert.match(g.cor, /^#[0-9A-F]{6}$/i);
    assert.ok(g.olhos.length >= 1 && g.olhos.every(([x, y]) => x > 0 && x < 1 && y > 0 && y < 1), g.id);
  }
  // toda reacao aparece pelo menos uma vez
  for (const r of REACOES) assert.ok(CATALOGO.some((g) => g.reacao === r), r);
});

test('gato do nivel: um por nivel e variantes depois do ultimo', () => {
  assert.equal(gatoDoNivel(1).gato.id, 'banana');
  assert.equal(gatoDoNivel(2).gato.id, 'oiia');
  assert.equal(gatoDoNivel(41).gato.id, 'german');
  assert.equal(gatoDoNivel(41).variante, 0);
  assert.equal(gatoDoNivel(42).gato.id, 'banana');
  assert.equal(gatoDoNivel(42).variante, 1);
  assert.equal(gatoDoNivel(83).variante, 2);
  assert.equal(gatoPorId('nyan')?.raridade, 'lendario');
  assert.equal(gatoPorId('nada'), null);
});
