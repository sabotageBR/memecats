// Cena do tabuleiro em canvas 2D: fundo da pagina, moldura, pecas (com tween,
// cola entre pecas certas, selecao e arrasto), mao do tutorial, espiada, selo
// de combo, PERFECT e a revelacao (brilho, confete e o palco com a reacao).
//
// Um relogio so: todo metodo recebe "agora" de performance.now(), o mesmo da
// agenda do main.js. A cena nao conhece regra: so le o tabuleiro que recebe.

import { certa, colada } from '../jogo/tabuleiro.js';
import { criarPalco } from './palco.js';
import { misturar } from './provisorio.js';

/** @typedef {import('../jogo/tabuleiro.js').Tabuleiro} Tabuleiro */
/** @typedef {import('./layout.js').Layout} Layout */
/** @typedef {import('./imagens.js').Imagens} Imagens */
/** @typedef {import('../jogo/catalogo.js').Gato} Gato */

const TINTA = '#2A2238';
const TROCA_MS = 240;
const ENTRADA_SEGURA = 750;
const ENTRADA_VOO = 520;
const BRILHO_MS = 520;
const FUSAO_MS = 260;
const COMBO_MS = 850;
/** O PERFECT bate na tela aqui; o som (audio.perfeito) usa o mesmo instante. */
const PERFEITO_BATIDA = 180;
/** ms do PERFECT ate a revelacao; dali o selo cresce e some. */
export const PERFEITO_MS = 1000;
const PERFEITO_FIM = 1300;
const TAU = Math.PI * 2;

/** Selo de combo por faixa (2-3, 4-5, 6-7, 8-9, 10+): [topo, base, extrusao]. */
const CORES_COMBO = [
  ['#FFF27A', '#FFAA1F', '#C25A00'],
  ['#E6FF7A', '#3FD45A', '#1E7A2E'],
  ['#A8F3FF', '#2E8BFF', '#1A4AA8'],
  ['#FFC2EC', '#FF3B9A', '#A3155A'],
  ['#E8C2FF', '#9B4DFF', '#55209E'],
];
const CORES_PERFEITO = ['#FFF6A0', '#FFC21F', '#D9480F'];
const PERFEITO_TXT = 'PERFECT!';

/** @param {number} k */
const saida = (k) => 1 - Math.pow(1 - k, 3);
/** saida com um leve passo alem do alvo @param {number} k */
const mola = (k) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
const lim = (/** @type {number} */ k) => (k < 0 ? 0 : k > 1 ? 1 : k);

/**
 * Caminho de retangulo com recuo por lado e canto arredondado so onde os dois
 * lados vizinhos tem recuo (onde ha cola o canto fica reto e some a borda).
 * @param {CanvasRenderingContext2D} c
 */
export function caminhoPeca(c, x, y, w, h, l, t, r, b, raio) {
  const x0 = x + l;
  const y0 = y + t;
  const x1 = x + w - r;
  const y1 = y + h - b;
  const k = Math.min(raio, (x1 - x0) / 2, (y1 - y0) / 2);
  const tl = l && t ? k : 0;
  const tr = r && t ? k : 0;
  const br = r && b ? k : 0;
  const bl = l && b ? k : 0;
  c.beginPath();
  c.moveTo(x0 + tl, y0);
  c.lineTo(x1 - tr, y0);
  if (tr) c.arcTo(x1, y0, x1, y0 + tr, tr);
  c.lineTo(x1, y1 - br);
  if (br) c.arcTo(x1, y1, x1 - br, y1, br);
  c.lineTo(x0 + bl, y1);
  if (bl) c.arcTo(x0, y1, x0, y1 - bl, bl);
  c.lineTo(x0, y0 + tl);
  if (tl) c.arcTo(x0, y0, x0 + tl, y0, tl);
  c.closePath();
}

/** @param {CanvasRenderingContext2D} c */
function retArred(c, x, y, w, h, r) {
  caminhoPeca(c, x, y, w, h, 1e-6, 1e-6, 1e-6, 1e-6, r);
}

/** Mao de desenho animado apontando (ponta do dedo em 0,0). @param {CanvasRenderingContext2D} c @param {number} s */
export function desenharMao(c, x, y, s, alfa, aperto) {
  c.save();
  c.globalAlpha = alfa;
  c.translate(x, y);
  c.scale(s * (1 - 0.08 * aperto), s * (1 - 0.08 * aperto));
  c.rotate(-0.35);
  c.lineJoin = 'round';
  c.lineWidth = 0.09;
  c.strokeStyle = TINTA;
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.moveTo(-0.13, 0.05);
  c.lineTo(-0.13, 0.62);
  c.quadraticCurveTo(-0.13, 0.7, -0.2, 0.68);
  c.quadraticCurveTo(-0.45, 0.55, -0.42, 0.78);
  c.quadraticCurveTo(-0.3, 1.05, -0.05, 1.25);
  c.lineTo(0.45, 1.25);
  c.quadraticCurveTo(0.6, 1.0, 0.58, 0.75);
  c.lineTo(0.58, 0.6);
  c.quadraticCurveTo(0.58, 0.48, 0.46, 0.48);
  c.quadraticCurveTo(0.42, 0.38, 0.3, 0.42);
  c.quadraticCurveTo(0.25, 0.32, 0.13, 0.38);
  c.lineTo(0.13, 0.05);
  c.quadraticCurveTo(0.13, -0.08, 0, -0.08);
  c.quadraticCurveTo(-0.13, -0.08, -0.13, 0.05);
  c.closePath();
  c.fill();
  c.stroke();
  c.restore();
  if (aperto > 0) {
    c.save();
    c.globalAlpha = alfa * (1 - aperto) * 0.8;
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = s * 0.06;
    c.beginPath();
    c.arc(x, y, s * (0.15 + 0.35 * aperto), 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
}

/** Estrela de quatro pontas (a mesma do brilho do palco). @param {CanvasRenderingContext2D} c */
function estrela(c, x, y, s, cor) {
  if (s <= 0) return;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 ? s * 0.28 : s;
    if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else c.moveTo(x + rr, y);
  }
  c.closePath();
  c.fillStyle = cor;
  c.fill();
}

/**
 * Texto de jogo no padrao Poki, centrado em (0, 0): extrusao embaixo,
 * contorno grosso, degrade vertical com faixa de brilho. Cada parte tem a
 * propria escala (o "x" menor do combo) e o proprio pulo (dy, em tam).
 * @param {CanvasRenderingContext2D} c
 * @param {{ txt: string, k?: number, dy?: number }[]} partes
 * @param {number} tam px
 * @param {string[]} cores [topo, base, extrusao]
 */
function textoGordo(c, partes, tam, cores) {
  const fonte = (/** @type {number} */ k) => `700 ${Math.max(1, Math.round(tam * k))}px Fredoka, system-ui, sans-serif`;
  const larg = partes.map((p) => {
    c.font = fonte(p.k || 1);
    return c.measureText(p.txt).width;
  });
  const total = larg.reduce((a, b) => a + b, 0);
  const base = tam * 0.34;
  const ext = Math.max(2, tam * 0.09);
  const gr = c.createLinearGradient(0, base - tam * 0.72, 0, base);
  gr.addColorStop(0, '#FFFFFF');
  gr.addColorStop(0.18, cores[0]);
  gr.addColorStop(0.5, cores[0]);
  gr.addColorStop(0.56, cores[1]);
  gr.addColorStop(1, cores[1]);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, tam * 0.2);
  c.strokeStyle = TINTA;
  // contornos primeiro (extrusao e frente), depois os recheios por cima
  for (const passo of [0, 1, 2, 3]) {
    let x = -total / 2;
    partes.forEach((p, i) => {
      c.font = fonte(p.k || 1);
      const y = base + (p.dy || 0) * tam + (passo === 0 || passo === 2 ? ext : 0);
      if (passo < 2) c.strokeText(p.txt, x, y);
      else {
        c.fillStyle = passo === 2 ? cores[2] : gr;
        c.fillText(p.txt, x, y);
      }
      x += larg[i];
    });
  }
}

/** @param {HTMLCanvasElement} canvas */
export function criarCena(canvas) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  let W = 1;
  let H = 1;
  let dpr = 1;
  /** @type {Layout|null} */
  let lay = null;
  /** @type {Tabuleiro|null} */
  let tab = null;
  /** @type {Imagens|null} */
  let im = null;
  /** @type {Gato|null} */
  let gato = null;
  /** @type {HTMLCanvasElement|null} */
  let fundoPagina = null;
  let corPagina = '';

  /** animacao de cada peca (por numero da peca), em px do canto da peca */
  /** @type {{ x0: number, y0: number, x1: number, y1: number, t0: number, dur: number, curva: (k: number) => number }[]} */
  let anim = [];
  /** @type {number|null} */
  let sel = null;
  let alvo = -1;
  /** @type {null|{ c: number, x: number, y: number }} centro da peca arrastada */
  let arrasto = null;
  /** @type {Map<number, number>} */
  const flashes = new Map();
  /** @type {Map<number, number>} */
  const tremidas = new Map();
  /** @type {null|{ de: number, para: number, t0: number }} */
  let mao = null;
  /** @type {null|{ t0: number, dur: number }} */
  let espiada = null;
  /** inicio do quadro inteiro (entrada mostrando a imagem; -1 nenhum) */
  let entradaT0 = -1;
  /** @type {null|{ t0: number }} */
  let revelacao = null;
  let palcoT0 = -1;
  let palcoIniciado = false;
  /** @type {null|{ n: number, celulas: number[], t0: number }} selo de combo (um por vez) */
  let selo = null;
  /** inicio do PERFECT (-1 nenhum) */
  let perfeitoT0 = -1;
  const palco = criarPalco();

  function montarFundoPagina() {
    if (!gato) return;
    const cv = fundoPagina || document.createElement('canvas');
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    const c = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = c.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
    g.addColorStop(0, misturar(gato.cor, '#FFFFFF', 0.28));
    g.addColorStop(1, misturar(gato.cor, '#1A1030', 0.35));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // patinhas espalhadas, bem leves
    c.fillStyle = 'rgba(255,255,255,.07)';
    const passo = Math.max(70, Math.min(W, H) / 5);
    for (let y = 0, i = 0; y < H + passo; y += passo, i++) {
      for (let x = (i % 2) * passo * 0.5; x < W + passo; x += passo) {
        const r = passo * 0.09;
        c.beginPath();
        c.ellipse(x, y + r * 0.4, r * 0.8, r * 0.65, 0, 0, Math.PI * 2);
        for (let k = -1; k <= 1; k++) c.ellipse(x + k * r * 0.65, y - r * 0.55 - (k ? 0 : r * 0.2), r * 0.3, r * 0.36, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    fundoPagina = cv;
    corPagina = gato.cor;
  }

  /** celula onde a peca p deveria estar desenhada agora */
  function celulaDaPeca(/** @type {number} */ p) {
    return tab ? tab.pos.indexOf(p) : -1;
  }

  /** @param {number} p @param {number} agora */
  function posPeca(p, agora) {
    const a = anim[p];
    if (!a) return { x: 0, y: 0, parada: true };
    const k = lim((agora - a.t0) / a.dur);
    const e = a.curva(k);
    return { x: a.x0 + (a.x1 - a.x0) * e, y: a.y0 + (a.y1 - a.y0) * e, parada: k >= 1 };
  }

  /** Pecas direto no lugar (sem tween). */
  function encaixarTudo() {
    if (!tab || !lay) return;
    anim = [];
    tab.pos.forEach((p, c) => {
      const r = /** @type {Layout} */ (lay).celula(c);
      anim[p] = { x0: r.x, y0: r.y, x1: r.x, y1: r.y, t0: 0, dur: 1, curva: saida };
    });
  }

  /** @param {number} agora */
  function sincronizar(agora, dur = TROCA_MS) {
    if (!tab || !lay) return 0;
    let mexeu = false;
    tab.pos.forEach((p, c) => {
      const r = /** @type {Layout} */ (lay).celula(c);
      const a = anim[p];
      if (a && a.x1 === r.x && a.y1 === r.y) return;
      const cur = posPeca(p, agora);
      anim[p] = { x0: cur.x, y0: cur.y, x1: r.x, y1: r.y, t0: agora, dur, curva: mola };
      mexeu = true;
    });
    return mexeu ? dur : 0;
  }

  /** @param {Imagens} img @param {number} p @param {number} x @param {number} y @param {number} w @param {number} h */
  function recorte(img, p, x, y, w, h) {
    if (!tab) return;
    const sw = img.w / tab.cols;
    const sh = img.h / tab.lins;
    ctx.drawImage(img.composta, (p % tab.cols) * sw, Math.floor(p / tab.cols) * sh, sw, sh, x, y, w, h);
  }

  /**
   * @param {number} c celula de referencia (para cola e decoracoes)
   * @param {number} p peca
   * @param {{ x: number, y: number }} pos canto atual
   * @param {number} agora
   * @param {{ escala?: number, sombra?: number, solto?: boolean }} [op]
   */
  function desenharPeca(c, p, pos, agora, op = {}) {
    if (!tab || !lay || !im) return;
    const { pw, ph } = lay;
    const g = Math.max(1.5, lay.ref * 0.0035);
    const raio = Math.min(pw, ph) * 0.1;
    const parada = !op.solto && tab.pos[c] === p && Math.abs(pos.x - lay.celula(c).x) < 0.5 && Math.abs(pos.y - lay.celula(c).y) < 0.5;
    const presa = parada && certa(tab, c);
    const col = c % tab.cols;
    const l = presa && col > 0 && colada(tab, c - 1, 'd') ? 0 : g;
    const r = presa && colada(tab, c, 'd') ? 0 : g;
    const t = presa && c >= tab.cols && colada(tab, c - tab.cols, 'b') ? 0 : g;
    const b = presa && colada(tab, c, 'b') ? 0 : g;
    let x = pos.x;
    let y = pos.y;
    const tr = tremidas.get(c);
    if (tr !== undefined) {
      const k = (agora - tr) / 300;
      if (k >= 1) tremidas.delete(c);
      else x += Math.sin(k * Math.PI * 6) * pw * 0.06 * (1 - k);
    }
    const fl = flashes.get(c);
    let pop = 1;
    if (fl !== undefined && parada) {
      const k = (agora - fl) / 420;
      if (k < 1) pop = 1 + 0.07 * Math.sin(Math.PI * Math.min(1, k * 1.6));
    }
    const s = (op.escala || 1) * pop;
    ctx.save();
    if (s !== 1) {
      ctx.translate(x + pw / 2, y + ph / 2);
      ctx.scale(s, s);
      ctx.translate(-(x + pw / 2), -(y + ph / 2));
    }
    if (!presa) {
      caminhoPeca(ctx, x, y + (op.sombra || 2), pw, ph, l, t, r, b, raio);
      ctx.fillStyle = `rgba(20,10,40,${op.sombra ? 0.3 : 0.22})`;
      ctx.fill();
    }
    caminhoPeca(ctx, x, y, pw, ph, l, t, r, b, raio);
    ctx.save();
    ctx.clip();
    recorte(im, p, x, y, pw, ph);
    ctx.restore();
    if (!presa) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = Math.max(1, g * 0.7);
      ctx.stroke();
    }
    if (fl !== undefined) {
      const k = (agora - fl) / 420;
      if (k >= 1) flashes.delete(c);
      else {
        ctx.fillStyle = `rgba(255,255,255,${0.65 * (1 - k)})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** @param {number} agora */
  function desenharPecas(agora) {
    if (!tab || !lay || !im) return;
    const ordem = [];
    for (let c = 0; c < tab.pos.length; c++) {
      const p = tab.pos[c];
      if (arrasto && arrasto.c === c) continue;
      if (sel === c) continue;
      ordem.push(c);
    }
    // pecas em movimento por cima das paradas
    const mov = [];
    for (const c of ordem) {
      const p = tab.pos[c];
      const pos = posPeca(p, agora);
      if (pos.parada) desenharPeca(c, p, pos, agora);
      else mov.push([c, p, pos]);
    }
    for (const [c, p, pos] of /** @type {[number, number, { x: number, y: number }][]} */ (mov)) desenharPeca(c, p, pos, agora, { solto: true, sombra: 4 });
    // alvo do arrasto
    if (alvo >= 0) {
      const r = lay.celula(alvo);
      ctx.save();
      retArred(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, Math.min(r.w, r.h) * 0.1);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(3, lay.ref * 0.008);
      ctx.setLineDash([Math.max(6, r.w * 0.12), Math.max(4, r.w * 0.08)]);
      ctx.lineDashOffset = -agora / 30;
      ctx.stroke();
      ctx.restore();
    }
  }


  /** Peca selecionada (levantada, balancando) e peca arrastada, por cima de tudo. @param {number} agora */
  function desenharLevantadas(agora) {
    if (!tab || !lay) return;
    // selecionada: levantada e balancando
    if (sel !== null && !(arrasto && arrasto.c === sel)) {
      const p = tab.pos[sel];
      const pos = posPeca(p, agora);
      const bob = Math.sin(agora / 160) * lay.ph * 0.02;
      desenharPeca(sel, p, { x: pos.x, y: pos.y - lay.ph * 0.05 + bob }, agora, { escala: 1.07, sombra: 6, solto: true });
      const r = lay.celula(sel);
      ctx.save();
      retArred(ctx, pos.x - lay.pw * 0.035, pos.y - lay.ph * 0.085 + bob, r.w * 1.07, r.h * 1.07, Math.min(r.w, r.h) * 0.12);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(3, lay.ref * 0.009);
      ctx.stroke();
      ctx.restore();
    }
    if (arrasto) {
      const p = tab.pos[arrasto.c];
      desenharPeca(arrasto.c, p, { x: arrasto.x - lay.pw / 2, y: arrasto.y - lay.ph / 2 }, agora, { escala: 1.12, sombra: 10, solto: true });
    }
  }

  /** @param {number} agora */
  function desenharMaoTutorial(agora) {
    if (!mao || !lay) return;
    const ciclo = 1700;
    const k = ((agora - mao.t0) % ciclo) / ciclo;
    const a = lay.celula(mao.de);
    const b = lay.celula(mao.para);
    const ax = a.x + a.w / 2;
    const ay = a.y + a.h / 2;
    const bx = b.x + b.w / 2;
    const by = b.y + b.h / 2;
    const m = lim((k - 0.22) / 0.5);
    const e = m < 0.5 ? 2 * m * m : 1 - Math.pow(-2 * m + 2, 2) / 2;
    const x = ax + (bx - ax) * e;
    const y = ay + (by - ay) * e;
    const alfa = k < 0.08 ? k / 0.08 : k > 0.86 ? 1 - (k - 0.86) / 0.14 : 1;
    const aperto = k < 0.22 ? lim(k / 0.12) : k > 0.72 && k < 0.86 ? 1 - lim((k - 0.72) / 0.14) : k >= 0.22 && k <= 0.72 ? 1 : 0;
    // rastro pontilhado
    ctx.save();
    ctx.globalAlpha = alfa * 0.7;
    ctx.setLineDash([lay.ref * 0.012, lay.ref * 0.018]);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(3, lay.ref * 0.008);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.restore();
    desenharMao(ctx, x, y, Math.min(lay.pw, lay.ph, lay.ref * 0.22) * 0.55, alfa, aperto);
  }

  /**
   * Selo "2x", "3x"... sobre as pecas que travaram: entra com estalo, sobe
   * inclinado e some. Anel e estrelas saem do centro das pecas.
   * @param {number} agora
   */
  function desenharCombo(agora) {
    if (!selo || !lay) return;
    const te = agora - selo.t0;
    if (te >= COMBO_MS) {
      selo = null;
      return;
    }
    if (te < 0) return;
    const { n } = selo;
    const cores = CORES_COMBO[Math.min(CORES_COMBO.length - 1, Math.floor((n - 2) / 2))];
    let ax = 0;
    let ay = 0;
    for (const c of selo.celulas) {
      const r = lay.celula(c);
      ax += r.x + r.w / 2;
      ay += r.y + r.h / 2;
    }
    ax /= selo.celulas.length;
    ay /= selo.celulas.length;
    const tam = Math.min(Math.max(Math.min(lay.pw, lay.ph) * 1.05, lay.ref * 0.13), lay.ref * 0.2) * (1 + 0.0625 * Math.min(n - 2, 8));

    // anel e estrelas
    const kA = lim(te / 420);
    if (kA < 1) {
      ctx.save();
      ctx.globalAlpha = 0.85 * (1 - kA);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(2, tam * 0.14 * (1 - kA));
      ctx.beginPath();
      ctx.arc(ax, ay, tam * (0.35 + 1.1 * saida(kA)), 0, TAU);
      ctx.stroke();
      const N = 6 + Math.min(n, 10);
      const kE = lim(te / 560);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU + n * 0.7;
        const d = tam * (0.4 + (1.2 + (i % 3) * 0.25) * saida(kE));
        estrela(ctx, ax + Math.cos(a) * d, ay + Math.sin(a) * d, tam * 0.17 * (1 - kE), i % 2 ? cores[0] : '#FFFFFF');
      }
      ctx.restore();
    }

    // texto: estalo (0,3 -> 1,25 -> 1), sobe e some nos ultimos 250 ms
    let s = 1;
    if (te < 110) s = 0.3 + 0.95 * saida(te / 110);
    else if (te < 240) s = 1.25 - 0.25 * saida((te - 110) / 130);
    const fim = lim((te - (COMBO_MS - 250)) / 250);
    s *= 1 + 0.15 * fim;
    const meia = tam * 0.4 * (String(n).length + 0.75);
    const x = lay.iw > meia * 2 ? Math.min(Math.max(ax, lay.ix + meia), lay.ix + lay.iw - meia) : lay.ix + lay.iw / 2;
    const y = Math.max(ay - saida(te / COMBO_MS) * Math.min(lay.ph, lay.ref * 0.25) * 0.6, lay.iy + tam * 0.5);
    ctx.save();
    ctx.globalAlpha = 1 - fim;
    ctx.translate(x, y);
    ctx.rotate(n % 2 ? -0.1 : 0.1);
    ctx.scale(s, s);
    textoGordo(ctx, [{ txt: String(n) }, { txt: 'x', k: 0.7 }], tam, cores);
    ctx.restore();
  }

  /**
   * PERFECT: o quadro escurece, raios dourados giram atras, a palavra bate na
   * tela (PERFEITO_BATIDA), as letras pulam em onda e, na revelacao, cresce e some.
   * @param {number} agora
   */
  function desenharPerfeito(agora) {
    if (perfeitoT0 < 0 || !lay) return;
    const te = agora - perfeitoT0;
    if (te >= PERFEITO_FIM) {
      perfeitoT0 = -1;
      return;
    }
    if (te < 0) return;
    const { ix, iy, iw, ih } = lay;
    const cx = ix + iw / 2;
    const cy = iy + ih / 2;
    const surge = lim(te / PERFEITO_BATIDA);
    const fim = lim((te - PERFEITO_MS) / (PERFEITO_FIM - PERFEITO_MS));
    const vis = surge * (1 - fim);

    // fundo: quadro escurecido e raios
    ctx.save();
    retArred(ctx, ix, iy, iw, ih, lay.borda * 0.9);
    ctx.clip();
    ctx.fillStyle = `rgba(20,10,40,${0.34 * vis})`;
    ctx.fillRect(ix, iy, iw, ih);
    const R = Math.hypot(iw, ih) * 0.6;
    ctx.translate(cx, cy);
    ctx.rotate(te / 1600);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    gr.addColorStop(0, 'rgba(255,220,90,.75)');
    gr.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = gr;
    ctx.globalAlpha = vis;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R * (0.6 + 0.4 * saida(surge)), a, a + TAU / 28);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();

    // tamanho: a palavra cabe em 86% do quadro e na tela
    ctx.font = '700 100px Fredoka, system-ui, sans-serif';
    const l100 = ctx.measureText(PERFEITO_TXT).width || 400;
    const tam = Math.min((100 * iw * 0.86) / l100, (100 * W * 0.92) / l100, lay.ref * 0.22);

    // coroa de estrelas na batida
    const kE = lim((te - PERFEITO_BATIDA) / 650);
    if (te >= PERFEITO_BATIDA && kE < 1) {
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + 0.26;
        const d = saida(kE);
        estrela(ctx, cx + Math.cos(a) * iw * 0.46 * d, cy + Math.sin(a) * tam * 1.5 * d, tam * 0.22 * (1 - kE), i % 2 ? CORES_PERFEITO[0] : '#FFFFFF');
      }
      ctx.restore();
    }

    // palavra: cai de 2,4 para 1 ate a batida, amassa um pouco e ondula
    let s;
    if (te < PERFEITO_BATIDA) s = 2.4 - 1.4 * Math.pow(te / PERFEITO_BATIDA, 2);
    else s = 1 - 0.07 * Math.sin(lim((te - PERFEITO_BATIDA) / 170) * Math.PI);
    s *= 1 + 0.3 * fim;
    const onda = lim((te - PERFEITO_BATIDA - 120) / 200);
    const partes = PERFEITO_TXT.split('').map((txt, i) => ({ txt, dy: -0.07 * onda * Math.max(0, Math.sin(te / 120 - i * 0.6)) }));
    ctx.save();
    ctx.globalAlpha = lim(te / (PERFEITO_BATIDA * 0.6)) * (1 - fim);
    ctx.translate(cx, cy - ih * 0.1 * fim);
    ctx.rotate(-0.1);
    ctx.scale(s, s);
    textoGordo(ctx, partes, tam, CORES_PERFEITO);
    ctx.restore();
  }

  return {
    get layout() {
      return lay;
    },
    get palco() {
      return palco;
    },
    /** @param {number} w @param {number} h @param {number} d */
    redimensionar(w, h, d) {
      W = w;
      H = h;
      dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      fundoPagina = null;
    },
    /**
     * @param {Tabuleiro} t @param {Layout} l @param {Imagens} img @param {Gato} g
     */
    configurar(t, l, img, g) {
      const novo = t !== tab;
      tab = t;
      lay = l;
      im = img;
      if (gato !== g) fundoPagina = null;
      gato = g;
      if (novo) {
        sel = null;
        alvo = -1;
        arrasto = null;
        mao = null;
        espiada = null;
        revelacao = null;
        palcoT0 = -1;
        flashes.clear();
        tremidas.clear();
        selo = null;
        perfeitoT0 = -1;
        palco.parar();
      }
      encaixarTudo();
    },
    /**
     * Mostra a imagem montada e depois embaralha voando. Devolve a duracao.
     * @param {number} agora
     * @param {boolean} [rapido] so o voo
     */
    entrada(agora, rapido = false) {
      if (!tab || !lay) return 0;
      const segura = rapido ? 0 : ENTRADA_SEGURA;
      entradaT0 = agora;
      tab.pos.forEach((p, c) => {
        const de = /** @type {Layout} */ (lay).celula(p);
        const para = /** @type {Layout} */ (lay).celula(c);
        anim[p] = { x0: de.x, y0: de.y, x1: para.x, y1: para.y, t0: agora + segura + (p % 7) * 18, dur: ENTRADA_VOO, curva: mola };
      });
      return segura + ENTRADA_VOO + 7 * 18;
    },
    /** @param {number} agora */
    sincronizar(agora) {
      return sincronizar(agora);
    },
    /** @param {number[]} celulas @param {number} agora */
    travou(celulas, agora) {
      for (const c of celulas) flashes.set(c, agora);
    },
    /** @param {number|null} c */
    selecionar(c) {
      sel = c;
    },
    /**
     * Peca seguindo o dedo (centro em x, y) ou null para soltar. Ao soltar, a
     * peca fica onde estava o dedo e o proximo sincronizar leva ela dali.
     * @param {null|{ c: number, x: number, y: number }} a @param {number} agora
     */
    arrastar(a, agora) {
      if (!a && arrasto && tab && lay) {
        const p = tab.pos[arrasto.c];
        const x = arrasto.x - lay.pw / 2;
        const y = arrasto.y - lay.ph / 2;
        anim[p] = { x0: x, y0: y, x1: x, y1: y, t0: agora, dur: 1, curva: saida };
      }
      arrasto = a;
    },
    /** @param {number} c */
    marcarAlvo(c) {
      alvo = c;
    },
    /** @param {number} c @param {number} agora */
    tremer(c, agora) {
      tremidas.set(c, agora);
    },
    /** @param {null|{ de: number, para: number }} m @param {number} agora */
    mostrarMao(m, agora) {
      mao = m ? { ...m, t0: agora } : null;
    },
    get temMao() {
      return !!mao;
    },
    /** @param {number} agora @param {number} ms */
    espiar(agora, ms) {
      espiada = { t0: agora, dur: ms };
    },
    /**
     * Selo de combo n sobre as celulas que travaram (troca o selo anterior).
     * @param {number} n @param {number[]} celulas @param {number} agora
     */
    combo(n, celulas, agora) {
      if (celulas.length) selo = { n, celulas: celulas.slice(), t0: agora };
    },
    /** PERFECT sobre o quadro; a revelacao entra PERFEITO_MS depois. @param {number} agora */
    perfeito(agora) {
      perfeitoT0 = agora;
      selo = null;
    },
    /**
     * Comeca a revelacao: brilho, fusao das pecas e o palco com a reacao.
     * Devolve o ms (a partir de agora) em que a reacao do gato comeca.
     * @param {number} agora
     */
    revelar(agora) {
      revelacao = { t0: agora };
      palcoT0 = agora + BRILHO_MS;
      palcoIniciado = false;
      if (lay) palco.confete({ x: lay.ix, y: lay.iy, w: lay.iw, h: lay.ih }, agora);
      sel = null;
      alvo = -1;
      arrasto = null;
      mao = null;
      espiada = null;
      return BRILHO_MS;
    },
    /** Repete a reacao (toque no gato revelado). @param {number} agora */
    reagir(agora) {
      if (!revelacao || !gato || agora < palcoT0) return false;
      palco.iniciar(gato, agora);
      return true;
    },
    /** O ponto esta sobre o quadro? */
    noQuadro(/** @type {number} */ x, /** @type {number} */ y) {
      return !!lay && x >= lay.x && y >= lay.y && x <= lay.x + lay.w && y <= lay.y + lay.h;
    },
    /** @param {number} agora */
    desenhar(agora) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!gato || !lay || !tab || !im) {
        ctx.fillStyle = '#2A2238';
        ctx.fillRect(0, 0, W, H);
        return;
      }
      if (!fundoPagina || corPagina !== gato.cor) montarFundoPagina();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (fundoPagina) ctx.drawImage(fundoPagina, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // moldura
      const { x, y, w, h, borda, ix, iy, iw, ih } = lay;
      ctx.save();
      ctx.shadowColor = 'rgba(20,10,40,.35)';
      ctx.shadowBlur = borda * 2.5;
      ctx.shadowOffsetY = borda * 0.6;
      retArred(ctx, x, y, w, h, borda * 1.8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
      retArred(ctx, ix, iy, iw, ih, borda * 0.9);
      ctx.fillStyle = misturar(gato.cor, '#2A2238', 0.55);
      ctx.fill();

      const raioQuadro = borda * 0.9;
      if (revelacao) {
        const tP = agora - palcoT0;
        // antes do palco, a imagem inteira (as pecas ja estao coladas)
        if (tP < FUSAO_MS) {
          ctx.save();
          retArred(ctx, ix, iy, iw, ih, raioQuadro);
          ctx.clip();
          ctx.drawImage(im.composta, ix, iy, iw, ih);
          ctx.restore();
        }
        if (tP >= 0) {
          if (!palcoIniciado) {
            palcoIniciado = true;
            palco.iniciar(gato, palcoT0);
          }
          palco.desenhar(ctx, im, { x: ix, y: iy, w: iw, h: ih }, agora, { raio: raioQuadro, alfa: lim(tP / FUSAO_MS) });
        }
        // brilho diagonal varrendo o quadro
        const k = (agora - revelacao.t0) / BRILHO_MS;
        if (k >= 0 && k <= 1.2) {
          ctx.save();
          retArred(ctx, ix, iy, iw, ih, raioQuadro);
          ctx.clip();
          const px = ix - iw * 0.6 + k * iw * 2.2;
          const gr = ctx.createLinearGradient(px - iw * 0.25, iy, px + iw * 0.25, iy + ih * 0.3);
          gr.addColorStop(0, 'rgba(255,255,255,0)');
          gr.addColorStop(0.5, 'rgba(255,255,255,.55)');
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gr;
          ctx.fillRect(ix, iy, iw, ih);
          ctx.restore();
        }
        desenharCombo(agora);
        desenharPerfeito(agora);
        return;
      }

      const segurando = entradaT0 >= 0 && agora - entradaT0 < ENTRADA_SEGURA && tab.pos.every((p) => anim[p] && anim[p].t0 > agora);
      if (segurando || perfeitoT0 >= 0) {
        // imagem inteira antes de embaralhar (ou ja montada, sob o PERFECT)
        ctx.save();
        retArred(ctx, ix, iy, iw, ih, raioQuadro);
        ctx.clip();
        ctx.drawImage(im.composta, ix, iy, iw, ih);
        ctx.restore();
      } else {
        ctx.save();
        retArred(ctx, ix, iy, iw, ih, raioQuadro);
        ctx.clip();
        desenharPecas(agora);
        ctx.restore();
        // a peca levantada ou arrastada pode sair do quadro
        desenharLevantadas(agora);
      }

      if (espiada) {
        const k = (agora - espiada.t0) / espiada.dur;
        if (k >= 1) espiada = null;
        else {
          const a = k < 0.1 ? k / 0.1 : k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
          ctx.save();
          ctx.globalAlpha = a * 0.95;
          retArred(ctx, ix, iy, iw, ih, raioQuadro);
          ctx.clip();
          ctx.drawImage(im.composta, ix, iy, iw, ih);
          ctx.restore();
        }
      }
      desenharMaoTutorial(agora);
      desenharCombo(agora);
      desenharPerfeito(agora);
    },
  };
}
