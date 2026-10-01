// Regras do quebra-cabeca de troca: desarranjo, troca, trava, dica e cola.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarTabuleiro, desarranjo, trocar, podeTrocar, certa, completo, dica, colada, quantasCertas } from '../src/jogo/tabuleiro.js';
import { criarRng } from '../src/core/rng.js';

test('desarranjo nunca deixa peca no lugar e e uma permutacao', () => {
  for (const n of [2, 3, 4, 9, 12, 16, 25, 36]) {
    for (let s = 1; s <= 200; s++) {
      const p = desarranjo(n, criarRng(s * 7919 + n));
      assert.equal(p.length, n);
      assert.deepEqual([...p].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
      p.forEach((v, i) => assert.notEqual(v, i, `n=${n} semente=${s}`));
    }
  }
});

test('mesma semente, mesma ordem; semente diferente muda', () => {
  const a = criarTabuleiro(4, 4, 123);
  const b = criarTabuleiro(4, 4, 123);
  const c = criarTabuleiro(4, 4, 124);
  assert.deepEqual(a.pos, b.pos);
  assert.notDeepEqual(a.pos, c.pos);
});

test('troca que acerta trava a peca e peca travada nao troca mais', () => {
  const t = { cols: 2, lins: 2, pos: [1, 0, 3, 2], jogadas: 0 };
  assert.deepEqual(trocar(t, 0, 1), [0, 1]);
  assert.ok(certa(t, 0) && certa(t, 1));
  assert.equal(t.jogadas, 1);
  assert.equal(podeTrocar(t, 0, 2), false);
  assert.equal(trocar(t, 0, 2), null);
  assert.equal(t.jogadas, 1);
  assert.equal(trocar(t, 2, 2), null);
  assert.deepEqual(trocar(t, 2, 3), [2, 3]);
  assert.ok(completo(t));
});

test('completo so com todas certas', () => {
  const t = { cols: 3, lins: 1, pos: [0, 2, 1], jogadas: 0 };
  assert.equal(completo(t), false);
  assert.equal(quantasCertas(t), 1);
  trocar(t, 1, 2);
  assert.equal(completo(t), true);
});

test('dica sempre trava pelo menos uma peca e resolve qualquer tabuleiro', () => {
  for (const [cols, lins] of [[2, 2], [3, 3], [3, 4], [4, 5], [6, 6]]) {
    for (let s = 1; s <= 40; s++) {
      const t = criarTabuleiro(cols, lins, s);
      const n = cols * lins;
      let passos = 0;
      while (!completo(t)) {
        const d = dica(t);
        assert.ok(d);
        const antes = quantasCertas(t);
        const travou = trocar(t, d.a, d.b);
        assert.ok(travou && travou.length >= 1);
        assert.equal(quantasCertas(t), antes + travou.length);
        passos++;
        assert.ok(passos < n);
      }
      assert.equal(dica(t), null);
    }
  }
});

test('dica prefere a troca que trava duas', () => {
  const t = { cols: 2, lins: 2, pos: [2, 3, 0, 1], jogadas: 0 };
  const d = dica(t);
  assert.ok(d);
  assert.equal(trocar(t, d.a, d.b)?.length, 2);
});

test('colada: so entre vizinhas certas, sem atravessar a borda da linha', () => {
  const t = { cols: 3, lins: 2, pos: [0, 1, 2, 4, 3, 5], jogadas: 0 };
  assert.equal(colada(t, 0, 'd'), true);
  assert.equal(colada(t, 2, 'd'), false);
  assert.equal(colada(t, 2, 'b'), true);
  assert.equal(colada(t, 0, 'b'), false);
  assert.equal(colada(t, 5, 'b'), false);
});
