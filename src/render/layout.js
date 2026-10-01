// Geometria pura do tabuleiro: um quadro com a proporcao da imagem, no meio
// da area livre entre o HUD de cima, o de baixo (retrato) ou a coluna da
// direita (paisagem).

/**
 * @typedef {Object} Layout
 * @property {number} x canto do quadro (com moldura)
 * @property {number} y
 * @property {number} w largura do quadro
 * @property {number} h altura do quadro
 * @property {number} borda espessura da moldura
 * @property {number} ix area das pecas
 * @property {number} iy
 * @property {number} iw largura da area das pecas
 * @property {number} ih altura da area das pecas
 * @property {number} ref medida de referencia (traco, mao) = raiz da area das pecas
 * @property {number} cols
 * @property {number} lins
 * @property {number} pw largura da peca
 * @property {number} ph altura da peca
 * @property {(c: number) => { x: number, y: number, w: number, h: number }} celula
 * @property {(px: number, py: number) => number} celulaEm -1 fora
 */

/** Teto da area das pecas (raiz da area, em px): no desktop nao estica demais. */
const TETO = 740;

/**
 * @param {{ W: number, H: number, topo: number, base: number, direita: number, cols: number, lins: number, proporcao?: number }} p
 *   proporcao: largura / altura da imagem (1 = quadrada)
 * @returns {Layout}
 */
export function calcularLayout({ W, H, topo, base, direita, cols, lins, proporcao = 1 }) {
  const margem = Math.max(10, Math.min(W, H) * 0.025);
  const aw = Math.max(80, W - direita - margem * 2);
  const ah = Math.max(80, Math.min(H, base) - topo - margem * 2);
  const prop = proporcao > 0 && Number.isFinite(proporcao) ? proporcao : 1;
  const borda = Math.max(6, Math.round(Math.min(aw, ah) * 0.022));
  // maior area com a proporcao da imagem que cabe dentro da moldura
  let iw = Math.min(aw - borda * 2, (ah - borda * 2) * prop);
  let ih = iw / prop;
  const k = Math.min(1, TETO / Math.sqrt(iw * ih));
  iw = Math.floor(iw * k);
  ih = Math.floor(ih * k);
  const w = iw + borda * 2;
  const h = ih + borda * 2;
  const x = Math.round((W - direita - w) / 2);
  const y = Math.round(topo + (Math.min(H, base) - topo - h) / 2);
  const ix = x + borda;
  const iy = y + borda;
  const pw = iw / cols;
  const ph = ih / lins;
  return {
    x, y, w, h, borda, ix, iy, iw, ih, ref: Math.sqrt(iw * ih), cols, lins, pw, ph,
    celula(c) {
      return { x: ix + (c % cols) * pw, y: iy + Math.floor(c / cols) * ph, w: pw, h: ph };
    },
    celulaEm(px, py) {
      const cx = Math.floor((px - ix) / pw);
      const cy = Math.floor((py - iy) / ph);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= lins) return -1;
      return cy * cols + cx;
    },
  };
}
