// Curva de dificuldade: tamanho da grade por nivel. Modulo puro.
// A curva vale para imagem quadrada. Imagem retangular (as fotos de meme)
// recebe a grade com quase o mesmo numero de pecas e pecas perto de quadradas
// (gradeParaImagem).

/** [ate o nivel, colunas, linhas] */
export const CURVA = Object.freeze([
  [1, 2, 2],
  [3, 3, 3],
  [8, 3, 4],
  [14, 4, 4],
  [20, 4, 5],
  [25, 5, 5],
  [28, 5, 6],
  [30, 6, 6],
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
 * O limite (de quem chama, pela tela) corta colunas e linhas para a peca nao
 * ficar pequena demais: no celular em pe, foto 16:9 com muita peca vira peca
 * de menos de 56 px, e la o abandono subiu no Player Fit Test.
 * @param {number} nivel
 * @param {number} proporcao largura / altura da imagem
 * @param {{ cols: number, lins: number }} [limite] maximo de colunas e linhas
 * @returns {{ cols: number, lins: number }}
 */
export function gradeParaImagem(nivel, proporcao, limite) {
  const base = grade(nivel);
  const alvo = base.cols * base.lins;
  const prop = proporcao > 0 && Number.isFinite(proporcao) ? proporcao : 1;
  const teto = (/** @type {number} */ v) => (Number.isFinite(v) ? Math.max(MIN, Math.min(MAX, Math.floor(v))) : MAX);
  const maxC = limite ? teto(limite.cols) : MAX;
  const maxL = limite ? teto(limite.lins) : MAX;
  /** quanto pior, maior: o numero de pecas pesa o dobro do formato da peca */
  const custo = (/** @type {number} */ c, /** @type {number} */ l) => 2 * Math.abs(Math.log((c * l) / alvo)) + Math.abs(Math.log((prop * l) / c));
  const cabe = base.cols <= maxC && base.lins <= maxL;
  let melhor = cabe ? base : { cols: MIN, lins: MIN };
  let menor = cabe ? custo(base.cols, base.lins) : Infinity;
  for (let c = MIN; c <= maxC; c++) {
    for (let l = MIN; l <= maxL; l++) {
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
