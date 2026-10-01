// Regras do quebra-cabeca de troca. Modulo puro: sem DOM, sem relogio e sem
// sorteio solto (o embaralhamento usa o RNG com semente de core/rng.js).
//
// O tabuleiro tem cols x lins celulas. A peca p pertence a celula p, entao
// pos[c] diz qual peca esta na celula c e a celula c esta certa quando
// pos[c] === c. Peca certa trava: nao sai mais do lugar.
//
// Pecas iguais na imagem (ver iguais.js) dividem uma classe: qualquer peca da
// classe fica certa em qualquer celula da classe.

import { criarRng, embaralhar } from '../core/rng.js';

/**
 * @typedef {Object} Tabuleiro
 * @property {number} cols
 * @property {number} lins
 * @property {number[]} pos pos[celula] = peca
 * @property {number} jogadas trocas feitas
 * @property {number[]} [classe] classe[peca]; sem ela, cada peca e unica
 */

/**
 * Desarranjo com semente: nenhuma peca comeca no lugar. Rejeicao (em media
 * e ~ 2,7 tentativas); se a sorte falhar, gira tudo uma casa.
 * @param {number} n
 * @param {() => number} r
 */
export function desarranjo(n, r) {
  const ids = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return ids;
  for (let t = 0; t < 64; t++) {
    const p = embaralhar(ids.slice(), r);
    if (p.every((v, i) => v !== i)) return p;
  }
  return ids.map((_, i) => (i + 1) % n);
}

/** @param {Tabuleiro} t @param {number} p */
const classeDe = (t, p) => (t.classe ? t.classe[p] : p);

/** @param {Tabuleiro} t @param {number} c */
export const certa = (t, c) => classeDe(t, t.pos[c]) === classeDe(t, c);

/** @param {Tabuleiro} t */
export const completo = (t) => t.pos.every((_, c) => certa(t, c));

/** @param {Tabuleiro} t */
export const quantasCertas = (t) => t.pos.reduce((n, _, c) => n + (certa(t, c) ? 1 : 0), 0);

/**
 * Com pecas iguais, parte delas cai numa celula da propria classe e ja
 * comeca travada. Se todas cairem, embaralha de novo; se a imagem for toda
 * igual, esquece as classes.
 * @param {number} cols
 * @param {number} lins
 * @param {number} semente
 * @param {number[]} [classe] classe[peca] (ver iguais.js)
 * @returns {Tabuleiro}
 */
export function criarTabuleiro(cols, lins, semente, classe) {
  const n = cols * lins;
  const r = criarRng(semente);
  /** @type {Tabuleiro} */
  const t = { cols, lins, pos: desarranjo(n, r), jogadas: 0 };
  if (!classe || classe.length !== n) return t;
  t.classe = classe.slice();
  for (let i = 0; i < 16 && completo(t); i++) t.pos = desarranjo(n, r);
  if (completo(t)) delete t.classe;
  return t;
}

/** @param {Tabuleiro} t @param {number} a @param {number} b */
export function podeTrocar(t, a, b) {
  const n = t.pos.length;
  return a !== b && a >= 0 && b >= 0 && a < n && b < n && !certa(t, a) && !certa(t, b);
}

/**
 * Troca as pecas das celulas a e b. Devolve as celulas que travaram com a
 * troca (0, 1 ou 2) ou null se a troca nao vale.
 * @param {Tabuleiro} t @param {number} a @param {number} b
 * @returns {number[]|null}
 */
export function trocar(t, a, b) {
  if (!podeTrocar(t, a, b)) return null;
  const x = t.pos[a];
  t.pos[a] = t.pos[b];
  t.pos[b] = x;
  t.jogadas++;
  return [a, b].filter((c) => certa(t, c));
}

/**
 * Uma troca que trava pelo menos uma peca, preferindo a que trava duas.
 * Serve a dica, a mao do tutorial e o jogador automatico.
 * @param {Tabuleiro} t
 * @returns {{ a: number, b: number }|null}
 */
export function dica(t) {
  /** @type {{ a: number, b: number }|null} */
  let uma = null;
  const n = t.pos.length;
  for (let c = 0; c < n; c++) {
    if (certa(t, c)) continue;
    // uma peca da classe de c esta solta em alguma celula d; trazer ela trava c
    const k = classeDe(t, c);
    for (let d = 0; d < n; d++) {
      if (d === c || certa(t, d) || classeDe(t, t.pos[d]) !== k) continue;
      if (classeDe(t, t.pos[c]) === classeDe(t, d)) return { a: d, b: c };
      if (!uma) uma = { a: d, b: c };
    }
  }
  return uma;
}

/**
 * Celulas vizinhas (dir e baixo) "coladas": as duas certas, sem borda entre elas.
 * @param {Tabuleiro} t @param {number} c @param {'d'|'b'} lado
 */
export function colada(t, c, lado) {
  const col = c % t.cols;
  const v = lado === 'd' ? (col + 1 < t.cols ? c + 1 : -1) : (c + t.cols < t.pos.length ? c + t.cols : -1);
  return v >= 0 && certa(t, c) && certa(t, v);
}
