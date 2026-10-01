// Pecas iguais: classes a partir da imagem reduzida e o tabuleiro com classes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classesIguais } from '../src/jogo/iguais.js';
import { criarTabuleiro, certa, completo, dica, trocar, quantasCertas, colada } from '../src/jogo/tabuleiro.js';

/**
 * Imagem sintetica RGBA de cols x lins pecas com k px cada; cor(p, x, y) da a
 * cor do pixel (x, y dentro da peca p).
 * @param {number} cols @param {number} lins @param {number} k
 * @param {(p: number, x: number, y: number) => [number, number, number]} cor
 */
function imagem(cols, lins, k, cor) {
  const larg = cols * k;
  const d = new Uint8ClampedArray(larg * lins * k * 4);
  for (let p = 0; p < cols * lins; p++) {
    for (let y = 0; y < k; y++) {
      for (let x = 0; x < k; x++) {
        const i = ((Math.floor(p / cols) * k + y) * larg + (p % cols) * k + x) * 4;
        const [r, g, b] = cor(p, x, y);
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
  }
  return d;
}

test('pecas lisas da mesma cor viram uma classe; pecas com detalhe ficam sozinhas', () => {
  // 3x2: pecas 0, 2 e 5 brancas; 1 branca com um risco preto; 3 e 4 com cores proprias
  const k = 12;
  const d = imagem(3, 2, k, (p, x) => {
    if (p === 1 && x === 5) return [0, 0, 0];
    if (p === 3) return [200, 40, 40];
    if (p === 4) return [40, 40, 200];
    return [250, 250, 250];
  });
  const c = classesIguais(d, 3, 2, k);
  assert.deepEqual(c, [0, 1, 0, 3, 4, 0]);
});

test('ruido pequeno (JPEG) nao separa pecas lisas; degrade nao vira uma classe so', () => {
  const k = 12;
  const ruido = classesIguais(imagem(4, 1, k, (p, x, y) => [240 + ((x * 7 + y * 3 + p) % 5), 240, 240]), 4, 1, k);
  assert.equal(new Set(ruido).size, 1);
  // degrade forte: de 0 a 255 em 8 pecas; vizinhas parecidas, pontas muito diferentes
  const deg = classesIguais(imagem(8, 1, k, (p) => [p * 36, p * 36, p * 36]), 8, 1, k);
  assert.equal(new Set(deg).size, 8);
});

test('tabuleiro com classes: peca igual trava em qualquer celula da classe', () => {
  // 2x2 com as pecas 0 e 1 iguais
  const t = { cols: 2, lins: 2, pos: [1, 0, 3, 2], jogadas: 0, classe: [0, 0, 2, 3] };
  assert.ok(certa(t, 0) && certa(t, 1));
  assert.ok(!certa(t, 2) && !certa(t, 3));
  assert.equal(quantasCertas(t), 2);
  assert.ok(colada(t, 0, 'd'));
  assert.deepEqual(trocar(t, 2, 3), [2, 3]);
  assert.ok(completo(t));
});

test('dica resolve qualquer tabuleiro com classes, sempre travando', () => {
  for (const [cols, lins] of [[2, 2], [4, 3], [5, 4], [7, 5], [8, 4]]) {
    const n = cols * lins;
    for (let s = 1; s <= 40; s++) {
      // classes variadas: metade das pecas em 3 grupos, o resto unico
      const classe = Array.from({ length: n }, (_, p) => (p % 2 ? [1, 3, 5][p % 3] : p));
      for (let p = 0; p < n; p++) classe[p] = classe.indexOf(classe[p]);
      const t = criarTabuleiro(cols, lins, s * 31 + n, classe);
      assert.ok(!completo(t), `${cols}x${lins} semente ${s} comecou completo`);
      let passos = 0;
      while (!completo(t)) {
        const d = dica(t);
        assert.ok(d);
        const antes = quantasCertas(t);
        const travou = trocar(t, d.a, d.b);
        assert.ok(travou && travou.length >= 1);
        assert.equal(quantasCertas(t), antes + travou.length);
        assert.ok(++passos < n);
      }
      assert.equal(dica(t), null);
    }
  }
});

test('imagem toda igual: o tabuleiro esquece as classes para nao nascer pronto', () => {
  const t = criarTabuleiro(3, 3, 7, new Array(9).fill(0));
  assert.equal(t.classe, undefined);
  assert.ok(!completo(t));
});
