// Gato provisorio desenhado em canvas: aparece quando o gato nao tem arte no
// manifesto ou quando a imagem falha ao carregar. Gera as mesmas duas camadas
// da arte de IA: fundo (sem gato) e gato (fundo transparente). Tudo em
// coordenadas 0..1 sobre um quadrado de S pixels. Gato sem entrada em GATOS
// sai cinza e sem acessorio.
//
// O fundo e cheio de formas de tamanhos e cores variadas: fundo liso deixa
// pecas iguais e o quebra-cabeca fica impossivel de ler.

import { criarRng, hashTexto } from '../core/rng.js';

export const S = 1024;
const TINTA = '#2A2238';
const LINHA = 0.009;

/** @param {number} n */
function tela(n = S) {
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  return c;
}

/** Mistura duas cores hex. @param {string} a @param {string} b @param {number} t */
export function misturar(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (/** @type {number} */ s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/**
 * Pelagem e detalhes de cada gato provisorio.
 * pelo, listras, olhos ('normal'|'feliz'|'fechado'|'grande'|'meio'|'lado'|'susto'|'choro'),
 * boca ('w'|'o'|'aberta'|'grito'|'lingua'|'sorriso'|'reta'), extra (acessorio).
 * @type {Record<string, { pelo: string, listras?: boolean, olhos?: string, boca?: string, extra?: string, corpo?: string, patas?: string }>}
 */
const GATOS = {
  banana: { pelo: '#F6F1E7', olhos: 'choro', boca: 'reta', extra: 'banana' },
  oiia: { pelo: '#9A8E80', listras: true, olhos: 'normal', boca: 'aberta' },
  huh: { pelo: '#F7F4EE', olhos: 'susto', boca: 'o', extra: 'sobrancelha' },
  pop: { pelo: '#F1E4CF', olhos: 'normal', boca: 'grito' },
  crying: { pelo: '#F4F1EA', olhos: 'choro', boca: 'reta' },
  happy: { pelo: '#C9BFB4', olhos: 'feliz', boca: 'aberta', patas: 'cima' },
  maxwell: { pelo: '#2E2E36', olhos: 'normal', boca: 'w' },
  vibing: { pelo: '#ECE6DC', olhos: 'feliz', boca: 'sorriso', extra: 'fone' },
  'side-eye': { pelo: '#ECE6DC', olhos: 'lado', boca: 'reta' },
  polite: { pelo: '#EEE7DC', olhos: 'meio', boca: 'w' },
  floppa: { pelo: '#C8955A', olhos: 'meio', boca: 'reta', extra: 'tufos' },
  cucumber: { pelo: '#E8964A', listras: true, olhos: 'susto', boca: 'o', extra: 'pepino' },
  bingus: { pelo: '#F0B9A4', olhos: 'grande', boca: 'w', extra: 'rugas' },
  grumpy: { pelo: '#E8DCCB', olhos: 'meio', boca: 'reta' },
  bongo: { pelo: '#F7F4EE', olhos: 'normal', boca: 'w' },
  smudge: { pelo: '#F4F1EA', olhos: 'susto', boca: 'reta', extra: 'mesa' },
  spaghetti: { pelo: '#B9A58C', listras: true, olhos: 'grande', boca: 'aberta', corpo: 'gordo' },
  screaming: { pelo: '#ECE6DC', olhos: 'susto', boca: 'grito' },
  staring: { pelo: '#D9D4CC', olhos: 'grande', boca: 'w' },
  omg: { pelo: '#ECE6DC', olhos: 'susto', boca: 'aberta' },
  wet: { pelo: '#8E8E98', listras: true, olhos: 'choro', boca: 'reta' },
  keyboard: { pelo: '#E8964A', olhos: 'feliz', boca: 'sorriso', extra: 'dj' },
  'heavy-breathing': { pelo: '#D9B48A', olhos: 'grande', boca: 'w' },
  'fits-sits': { pelo: '#2E2E36', olhos: 'grande', boca: 'w', extra: 'caixa' },
  bread: { pelo: '#2E2E36', olhos: 'grande', boca: 'o', extra: 'fatia' },
  breading: { pelo: '#F4F1EA', olhos: 'normal', boca: 'w', extra: 'fatia' },
  hipster: { pelo: '#E8964A', listras: true, olhos: 'normal', boca: 'sorriso', extra: 'oculos' },
  business: { pelo: '#2E2E36', olhos: 'normal', boca: 'reta', extra: 'gravata' },
  pusheen: { pelo: '#B9A898', listras: true, olhos: 'normal', boca: 'w', corpo: 'pao' },
  maru: { pelo: '#C9B8A6', listras: true, olhos: 'meio', boca: 'w', extra: 'caixa' },
  'lil-bub': { pelo: '#8E8E98', listras: true, olhos: 'meio', boca: 'lingua' },
};

// ------------------------------------------------------------- utilitarios
/** @param {CanvasRenderingContext2D} c */
function contorno(c, cor = TINTA, w = LINHA) {
  c.strokeStyle = cor;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke();
}
/** @param {CanvasRenderingContext2D} c */
function elipse(c, x, y, rx, ry, cor, linha = true, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fillStyle = cor;
  c.fill();
  if (linha) contorno(c);
}
/** @param {CanvasRenderingContext2D} c @param {number[][]} pts */
function poligono(c, pts, cor, linha = true) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = cor;
  c.fill();
  if (linha) contorno(c);
}
/** @param {CanvasRenderingContext2D} c */
function retang(c, x, y, w, h, r, cor, linha = true) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
  c.fillStyle = cor;
  c.fill();
  if (linha) contorno(c);
}
/** @param {CanvasRenderingContext2D} c */
function estrela(c, x, y, r, pontas, cor, rot = 0) {
  c.beginPath();
  for (let i = 0; i < pontas * 2; i++) {
    const a = rot + (i * Math.PI) / pontas;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
  c.fillStyle = cor;
  c.fill();
}
/** @param {CanvasRenderingContext2D} c */
function coracao(c, x, y, r, cor, linha = false) {
  c.beginPath();
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.45);
  c.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  c.fillStyle = cor;
  c.fill();
  if (linha) contorno(c, TINTA, LINHA * 0.7);
}
/** @param {CanvasRenderingContext2D} c */
function pata(c, x, y, r, cor) {
  elipse(c, x, y + r * 0.35, r * 0.75, r * 0.6, cor, false);
  for (let i = -1; i <= 1; i++) elipse(c, x + i * r * 0.62, y - r * 0.45 - (i ? 0 : r * 0.2), r * 0.3, r * 0.34, cor, false);
}

// ------------------------------------------------------------------ fundo
/** @param {string} id @param {string} cor @param {number} n */
function desenharFundo(id, cor, n) {
  const cv = tela(n);
  const c = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
  c.scale(n, n);
  const r = criarRng(hashTexto('fundo:' + id));
  const g = c.createLinearGradient(0, 0, 0, 1);
  g.addColorStop(0, misturar(cor, '#FFFFFF', 0.45));
  g.addColorStop(0.62, misturar(cor, '#FFFFFF', 0.12));
  g.addColorStop(1, misturar(cor, '#000000', 0.18));
  c.fillStyle = g;
  c.fillRect(0, 0, 1, 1);
  // raios suaves atras do gato
  c.save();
  c.translate(0.5, 0.5);
  for (let i = 0; i < 16; i++) {
    c.rotate((Math.PI * 2) / 16);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-0.08, -0.9);
    c.lineTo(0.08, -0.9);
    c.closePath();
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,0)';
    c.fill();
  }
  c.restore();
  // formas espalhadas em grade com sorteio: toda regiao ganha detalhe
  const paleta = [misturar(cor, '#FFFFFF', 0.7), misturar(cor, '#000000', 0.25), '#FFFFFF', misturar(cor, '#FF4FA0', 0.5), misturar(cor, '#3CC8FF', 0.5), misturar(cor, '#FFE14F', 0.55)];
  const m = 9;
  for (let gy = 0; gy < m; gy++) {
    for (let gx = 0; gx < m; gx++) {
      for (let k = 0; k < 2; k++) {
        const x = (gx + r()) / m;
        const y = (gy + r()) / m;
        const t = 0.018 + r() * 0.045;
        const corF = paleta[Math.floor(r() * paleta.length)];
        c.globalAlpha = 0.35 + r() * 0.5;
        const tipo = Math.floor(r() * 6);
        if (tipo === 0) elipse(c, x, y, t, t, corF, false);
        else if (tipo === 1) estrela(c, x, y, t * 1.3, 5, corF, r() * 6);
        else if (tipo === 2) coracao(c, x, y, t, corF);
        else if (tipo === 3) pata(c, x, y, t, corF);
        else if (tipo === 4) retang(c, x - t, y - t, t * 2, t * 2, t * 0.5, corF, false);
        else {
          c.beginPath();
          c.arc(x, y, t, 0, Math.PI * 2);
          c.strokeStyle = corF;
          c.lineWidth = t * 0.45;
          c.stroke();
        }
      }
    }
  }
  c.globalAlpha = 1;
  // chao
  const chao = c.createLinearGradient(0, 0.8, 0, 1);
  chao.addColorStop(0, 'rgba(255,255,255,.35)');
  chao.addColorStop(1, 'rgba(0,0,0,.12)');
  c.fillStyle = chao;
  c.beginPath();
  c.ellipse(0.5, 1.02, 0.75, 0.2, 0, 0, Math.PI * 2);
  c.fill();
  elipse(c, 0.5, 0.905, 0.25, 0.04, 'rgba(0,0,0,.18)', false);
  return cv;
}

// ------------------------------------------------------------------- gato
/** @param {CanvasRenderingContext2D} c @param {string} pelo @param {boolean} [listras] */
function cabeca(c, pelo, listras) {
  // orelhas
  for (const s of [-1, 1]) {
    poligono(c, [[0.5 + s * 0.175, 0.39], [0.5 + s * 0.15, 0.2], [0.5 + s * 0.05, 0.31]], pelo);
    poligono(c, [[0.5 + s * 0.155, 0.36], [0.5 + s * 0.142, 0.245], [0.5 + s * 0.08, 0.315]], '#F7A6B8', false);
  }
  elipse(c, 0.5, 0.47, 0.215, 0.185, pelo);
  if (listras) {
    c.save();
    c.beginPath();
    c.ellipse(0.5, 0.47, 0.212, 0.182, 0, 0, Math.PI * 2);
    c.clip();
    c.strokeStyle = misturar(pelo.startsWith('#') ? pelo : '#888888', '#000000', 0.28);
    c.lineWidth = 0.016;
    c.lineCap = 'round';
    for (const dx of [-0.045, 0, 0.045]) {
      c.beginPath();
      c.moveTo(0.5 + dx, 0.29);
      c.lineTo(0.5 + dx * 0.7, 0.36);
      c.stroke();
    }
    for (const s of [-1, 1]) {
      for (const dy of [0, 0.035]) {
        c.beginPath();
        c.moveTo(0.5 + s * 0.215, 0.47 + dy);
        c.lineTo(0.5 + s * 0.17, 0.465 + dy);
        c.stroke();
      }
    }
    c.restore();
  }
  // bochechas
  elipse(c, 0.39, 0.54, 0.035, 0.02, 'rgba(255,120,150,.35)', false);
  elipse(c, 0.61, 0.54, 0.035, 0.02, 'rgba(255,120,150,.35)', false);
}

/** @param {CanvasRenderingContext2D} c @param {string} tipo @param {string} pelo */
function olhos(c, tipo, pelo) {
  const escuro = parseInt(pelo.slice(1, 3), 16) < 90;
  const traco = escuro ? '#F4EFE6' : TINTA;
  for (const s of [-1, 1]) {
    const x = 0.5 + s * 0.085;
    const y = 0.47;
    if (tipo === 'feliz') {
      c.beginPath();
      c.arc(x, y + 0.012, 0.03, Math.PI * 1.1, Math.PI * 1.9);
      contorno(c, traco, 0.012);
      continue;
    }
    if (tipo === 'fechado') {
      c.beginPath();
      c.arc(x, y - 0.012, 0.03, Math.PI * 0.15, Math.PI * 0.85);
      contorno(c, traco, 0.012);
      continue;
    }
    const grande = tipo === 'grande';
    const rx = grande ? 0.058 : 0.043;
    const ry = grande ? 0.064 : 0.05;
    elipse(c, x, y, rx, ry, '#FFFFFF');
    let px = x;
    let py = y + 0.004;
    let pr = grande ? 0.046 : 0.028;
    if (tipo === 'susto') pr = 0.013;
    if (tipo === 'lado') px = x + 0.022;
    elipse(c, px, py, pr, pr * (tipo === 'susto' ? 1 : 1.08), '#1A1424', false);
    elipse(c, px - pr * 0.35, py - pr * 0.4, pr * 0.32, pr * 0.32, '#FFFFFF', false);
    if (grande) elipse(c, px + pr * 0.35, py + pr * 0.35, pr * 0.15, pr * 0.15, '#FFFFFF', false);
    if (tipo === 'meio' || tipo === 'lado') {
      // palpebra caida
      c.save();
      c.beginPath();
      c.ellipse(x, y, rx + 0.002, ry + 0.002, 0, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = pelo;
      c.fillRect(x - rx - 0.01, y - ry - 0.01, rx * 2 + 0.02, ry * (tipo === 'lado' ? 0.85 : 1.05));
      c.restore();
      c.beginPath();
      c.moveTo(x - rx, y - ry * (tipo === 'lado' ? 0.15 : -0.05));
      c.lineTo(x + rx, y - ry * (tipo === 'lado' ? 0.15 : -0.05));
      contorno(c, traco, 0.011);
    }
    if (tipo === 'choro') {
      // olho marejado e lagrima parada
      elipse(c, x, y + ry * 0.75, rx * 0.95, ry * 0.3, 'rgba(110,190,255,.75)', false);
      c.beginPath();
      c.moveTo(x + s * 0.01, y + ry);
      c.quadraticCurveTo(x + s * 0.02, y + 0.09, x + s * 0.008, y + 0.12);
      contorno(c, '#6EC1FF', 0.014);
    }
  }
}

/** @param {CanvasRenderingContext2D} c @param {string} tipo @param {string} pelo */
function boca(c, tipo, pelo) {
  const escuro = parseInt(pelo.slice(1, 3), 16) < 90;
  const traco = escuro ? '#F4EFE6' : TINTA;
  poligono(c, [[0.485, 0.528], [0.515, 0.528], [0.5, 0.545]], '#F27C97', false);
  const y = 0.55;
  if (tipo === 'w' || tipo === 'lingua' || tipo === 'sorriso') {
    c.beginPath();
    c.moveTo(0.5, 0.545);
    c.lineTo(0.5, y);
    c.arc(0.482, y, 0.018, 0, Math.PI * (tipo === 'sorriso' ? 1 : 0.9));
    c.moveTo(0.5, y);
    c.arc(0.518, y, 0.018, Math.PI, Math.PI * (tipo === 'sorriso' ? 0 : 0.1), true);
    contorno(c, traco, 0.009);
    if (tipo === 'lingua') {
      retang(c, 0.488, 0.56, 0.026, 0.05, 0.013, '#FF6F8E');
      c.beginPath();
      c.moveTo(0.501, 0.565);
      c.lineTo(0.501, 0.598);
      contorno(c, '#D9476A', 0.005);
    }
  } else if (tipo === 'o') {
    elipse(c, 0.5, 0.575, 0.014, 0.018, '#5A1F2E');
  } else if (tipo === 'aberta') {
    c.beginPath();
    c.ellipse(0.5, 0.572, 0.035, 0.032, 0, 0, Math.PI * 2);
    c.fillStyle = '#5A1F2E';
    c.fill();
    contorno(c, traco);
    elipse(c, 0.5, 0.588, 0.02, 0.012, '#FF7D98', false);
  } else if (tipo === 'grito') {
    c.beginPath();
    c.ellipse(0.5, 0.59, 0.05, 0.055, 0, 0, Math.PI * 2);
    c.fillStyle = '#5A1F2E';
    c.fill();
    contorno(c, traco);
    elipse(c, 0.5, 0.615, 0.03, 0.018, '#FF7D98', false);
    poligono(c, [[0.47, 0.548], [0.478, 0.565], [0.486, 0.546]], '#FFFFFF', false);
    poligono(c, [[0.514, 0.546], [0.522, 0.565], [0.53, 0.548]], '#FFFFFF', false);
  } else {
    c.beginPath();
    c.moveTo(0.48, 0.565);
    c.quadraticCurveTo(0.5, 0.558, 0.52, 0.565);
    contorno(c, traco, 0.009);
  }
  // bigodes
  c.globalAlpha = 0.8;
  for (const s of [-1, 1]) {
    for (const dy of [-0.012, 0.006, 0.024]) {
      c.beginPath();
      c.moveTo(0.5 + s * 0.06, 0.54 + dy * 0.5);
      c.lineTo(0.5 + s * 0.17, 0.53 + dy * 1.6);
      contorno(c, traco, 0.004);
    }
  }
  c.globalAlpha = 1;
}

/** @param {CanvasRenderingContext2D} c @param {string} pelo @param {string} [tipo] */
function corpo(c, pelo, tipo) {
  const barriga = misturar(pelo, '#FFFFFF', 0.45);
  // rabo
  c.beginPath();
  c.moveTo(0.64, 0.83);
  c.bezierCurveTo(0.82, 0.85, 0.86, 0.66, 0.77, 0.6);
  c.strokeStyle = TINTA;
  c.lineWidth = 0.062;
  c.lineCap = 'round';
  c.stroke();
  c.strokeStyle = pelo;
  c.lineWidth = 0.045;
  c.stroke();
  if (tipo === 'pao') {
    retang(c, 0.28, 0.6, 0.44, 0.3, 0.14, pelo);
    elipse(c, 0.5, 0.78, 0.13, 0.08, barriga, false);
    return;
  }
  const rx = tipo === 'gordo' ? 0.29 : 0.19;
  const ry = tipo === 'gordo' ? 0.2 : 0.17;
  elipse(c, 0.5, 0.75, rx, ry, pelo);
  elipse(c, 0.5, 0.77, rx * 0.55, ry * 0.65, barriga, false);
  elipse(c, 0.42, 0.885, 0.05, 0.03, pelo);
  elipse(c, 0.58, 0.885, 0.05, 0.03, pelo);
}

/** @param {CanvasRenderingContext2D} c @param {string} pelo @param {string} tipo */
function patas(c, pelo, tipo) {
  if (tipo === 'cima') {
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(0.5 + s * 0.13, 0.7);
      c.lineTo(0.5 + s * 0.27, 0.56);
      c.strokeStyle = TINTA;
      c.lineWidth = 0.07;
      c.lineCap = 'round';
      c.stroke();
      c.strokeStyle = pelo;
      c.lineWidth = 0.052;
      c.stroke();
      elipse(c, 0.5 + s * 0.28, 0.545, 0.04, 0.036, pelo);
      elipse(c, 0.5 + s * 0.28, 0.55, 0.016, 0.013, '#F7A6B8', false);
    }
  }
}

/** @param {CanvasRenderingContext2D} c @param {string} extra @param {string} pelo */
function acessorioAtras(c, extra, pelo) {
  if (extra === 'banana') {
    // fantasia de banana: corpo e capuz amarelos
    elipse(c, 0.5, 0.75, 0.21, 0.18, '#FFD93B');
    c.beginPath();
    c.moveTo(0.5, 0.2);
    c.bezierCurveTo(0.8, 0.2, 0.8, 0.72, 0.5, 0.72);
    c.bezierCurveTo(0.2, 0.72, 0.2, 0.2, 0.5, 0.2);
    c.fillStyle = '#FFD93B';
    c.fill();
    contorno(c);
    retang(c, 0.48, 0.12, 0.04, 0.1, 0.01, '#7A5B2E');
    c.beginPath();
    c.moveTo(0.36, 0.3);
    c.quadraticCurveTo(0.5, 0.26, 0.64, 0.3);
    contorno(c, '#D9A92A', 0.012);
  } else if (extra === 'fatia') {
    c.beginPath();
    c.moveTo(0.27, 0.66);
    c.lineTo(0.27, 0.36);
    c.bezierCurveTo(0.2, 0.2, 0.36, 0.14, 0.5, 0.18);
    c.bezierCurveTo(0.64, 0.14, 0.8, 0.2, 0.73, 0.36);
    c.lineTo(0.73, 0.66);
    c.closePath();
    c.fillStyle = '#B9752F';
    c.fill();
    contorno(c);
  }
}

/** @param {CanvasRenderingContext2D} c @param {string} extra @param {string} pelo */
function acessorioFrente(c, extra, pelo) {
  switch (extra) {
    case 'sobrancelha':
      c.beginPath();
      c.moveTo(0.555, 0.39);
      c.lineTo(0.63, 0.37);
      contorno(c, TINTA, 0.014);
      break;
    case 'mesa':
      retang(c, 0.1, 0.8, 0.8, 0.22, 0.02, '#FFFFFF');
      elipse(c, 0.5, 0.82, 0.19, 0.05, '#E9EEF5');
      for (let i = 0; i < 7; i++) elipse(c, 0.39 + i * 0.037, 0.805 + (i % 2) * 0.01, 0.03, 0.02, i % 3 ? '#5BC24A' : '#3E9E36', false, i);
      elipse(c, 0.47, 0.8, 0.018, 0.016, '#FF4B4B', false);
      elipse(c, 0.56, 0.808, 0.016, 0.014, '#FF4B4B', false);
      break;
    case 'fone':
    case 'dj':
      c.beginPath();
      c.arc(0.5, 0.45, 0.24, Math.PI * 1.1, Math.PI * 1.9);
      contorno(c, '#2A2238', 0.03);
      retang(c, 0.25, 0.4, 0.06, 0.12, 0.03, extra === 'dj' ? '#FF4FA0' : '#3CC8FF');
      retang(c, 0.69, 0.4, 0.06, 0.12, 0.03, extra === 'dj' ? '#FF4FA0' : '#3CC8FF');
      if (extra === 'dj') {
        retang(c, 0.22, 0.8, 0.56, 0.16, 0.03, '#2A2238');
        elipse(c, 0.36, 0.86, 0.09, 0.035, '#111111');
        elipse(c, 0.36, 0.86, 0.025, 0.01, '#FF4FA0', false);
        elipse(c, 0.64, 0.86, 0.09, 0.035, '#111111');
        elipse(c, 0.64, 0.86, 0.025, 0.01, '#3CC8FF', false);
      }
      break;
    case 'gravata':
      poligono(c, [[0.5, 0.63], [0.44, 0.6], [0.44, 0.66]], '#FF4FA0');
      poligono(c, [[0.5, 0.63], [0.56, 0.6], [0.56, 0.66]], '#FF4FA0');
      elipse(c, 0.5, 0.63, 0.014, 0.014, '#FF7BB5');
      break;
    case 'oculos':
      retang(c, 0.37, 0.44, 0.11, 0.065, 0.025, '#111111');
      retang(c, 0.52, 0.44, 0.11, 0.065, 0.025, '#111111');
      c.beginPath();
      c.moveTo(0.48, 0.46);
      c.lineTo(0.52, 0.46);
      contorno(c, '#111111', 0.012);
      poligono(c, [[0.39, 0.455], [0.42, 0.455], [0.4, 0.49], [0.385, 0.49]], 'rgba(255,255,255,.75)', false);
      poligono(c, [[0.54, 0.455], [0.57, 0.455], [0.55, 0.49], [0.535, 0.49]], 'rgba(255,255,255,.75)', false);
      break;
    case 'rugas':
      for (const dy of [0, 0.022]) {
        c.beginPath();
        c.moveTo(0.45, 0.36 + dy);
        c.quadraticCurveTo(0.5, 0.35 + dy, 0.55, 0.36 + dy);
        contorno(c, '#C9846E', 0.008);
      }
      break;
    case 'tufos':
      for (const s of [-1, 1]) poligono(c, [[0.5 + s * 0.15, 0.21], [0.5 + s * 0.16, 0.12], [0.5 + s * 0.135, 0.2]], '#1A1424');
      break;
    case 'pepino':
      c.save();
      c.translate(0.2, 0.86);
      c.rotate(-0.25);
      retang(c, -0.13, -0.035, 0.26, 0.07, 0.035, '#3E9E36');
      for (let i = 0; i < 5; i++) elipse(c, -0.09 + i * 0.045, -0.005, 0.006, 0.006, '#9BE07F', false);
      c.restore();
      break;
    case 'caixa':
      retang(c, 0.25, 0.66, 0.5, 0.3, 0.01, '#C8925A');
      poligono(c, [[0.25, 0.66], [0.17, 0.6], [0.3, 0.6], [0.36, 0.66]], '#B07A45');
      poligono(c, [[0.75, 0.66], [0.83, 0.6], [0.7, 0.6], [0.64, 0.66]], '#B07A45');
      retang(c, 0.44, 0.66, 0.12, 0.3, 0, 'rgba(255,255,255,.18)', false);
      for (const s of [-1, 1]) elipse(c, 0.5 + s * 0.09, 0.665, 0.045, 0.028, pelo);
      break;
    default:
  }
}

/** @param {string} id @param {number} n */
function desenharGato(id, n) {
  const cfg = GATOS[id] || { pelo: '#B9B9C2' };
  const cv = tela(n);
  const c = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
  c.scale(n, n);
  const extra = cfg.extra || '';
  acessorioAtras(c, extra, cfg.pelo);
  if (extra !== 'banana') corpo(c, cfg.pelo, cfg.corpo);
  else {
    elipse(c, 0.42, 0.885, 0.05, 0.03, cfg.pelo);
    elipse(c, 0.58, 0.885, 0.05, 0.03, cfg.pelo);
  }
  if (extra === 'fatia') {
    elipse(c, 0.5, 0.45, 0.2, 0.19, '#F2D8A0', false);
  }
  cabeca(c, cfg.pelo, cfg.listras);
  olhos(c, cfg.olhos || 'normal', cfg.pelo);
  boca(c, cfg.boca || 'w', cfg.pelo);
  if (cfg.patas) patas(c, cfg.pelo, cfg.patas);
  acessorioFrente(c, extra, cfg.pelo);
  return cv;
}

/**
 * As duas camadas do gato provisorio.
 * @param {{ id: string, cor: string }} gato
 * @param {number} [n] lado em pixels
 * @returns {{ fundo: HTMLCanvasElement, gato: HTMLCanvasElement }}
 */
export function gatoProvisorio(gato, n = S) {
  return { fundo: desenharFundo(gato.id, gato.cor, n), gato: desenharGato(gato.id, n) };
}
