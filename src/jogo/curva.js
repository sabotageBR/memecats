// Curva de dificuldade: tamanho da grade por nivel. Modulo puro.
// A curva vale para imagem quadrada. Imagem retangular (as fotos de meme)
// recebe a grade com quase o mesmo numero de pecas e pecas perto de quadradas
// (gradeParaImagem).

/** [ate o nivel, colunas, linhas] */
export const CURVA = Object.freeze([
  [1, 2, 2],
  [3, 3, 3],
  [6, 3, 4],
  [10, 4, 4],
  [16, 4, 5],
  [24, 5, 5],
  [33, 5, 6],
  [41, 6, 6],
]);

/** Depois do ultimo gato (variantes), a grade gira entre estes tamanhos. */
const RODIZIO = Object.freeze([[5, 5], [5, 6], [6, 6]]);

/** Limites da grade retangular. */
const MIN = 2;
const MAX = 8;

/**
 * @param {number} nivel 1, 2, ...
 * @returns {{ cols: number, lins: number }}
 */
export function grade(nivel) {
  const n = Math.max(1, Math.floor(nivel));
  for (const [ate, cols, lins] of CURVA) if (n <= ate) return { cols, lins };
  const [cols, lins] = RODIZIO[(n - CURVA[CURVA.length - 1][0] - 1) % RODIZIO.length];
  return { cols, lins };
}

/**
 * Grade para uma imagem de proporcao w/h: perto do numero de pecas da curva,
 * com a peca o mais quadrada possivel. Na imagem quadrada, e a propria curva.
 * @param {number} nivel
 * @param {number} proporcao largura / altura da imagem
 * @returns {{ cols: number, lins: number }}
 */
export function gradeParaImagem(nivel, proporcao) {
  const base = grade(nivel);
  const alvo = base.cols * base.lins;
  const prop = proporcao > 0 && Number.isFinite(proporcao) ? proporcao : 1;
  /** quanto pior, maior: o numero de pecas pesa o dobro do formato da peca */
  const custo = (/** @type {number} */ c, /** @type {number} */ l) => 2 * Math.abs(Math.log((c * l) / alvo)) + Math.abs(Math.log((prop * l) / c));
  let melhor = base;
  let menor = custo(base.cols, base.lins);
  for (let c = MIN; c <= MAX; c++) {
    for (let l = MIN; l <= MAX; l++) {
      const v = custo(c, l);
      if (v < menor - 1e-9) {
        melhor = { cols: c, lins: l };
        menor = v;
      }
    }
  }
  return melhor;
}

/**
 * Semente fixa por nivel: o mesmo nivel embaralha sempre igual.
 * @param {number} nivel
 */
export const sementeDoNivel = (nivel) => (Math.imul(Math.max(1, nivel | 0), 2654435761) ^ 0x5eed) >>> 0;
