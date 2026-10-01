// Album de figurinhas: os gatos liberados com moldura de raridade e os
// bloqueados como "?" na cor da raridade. Tocar numa figurinha abre o palco:
// o gato grande repetindo a reacao a cada toque (o album vira brinquedo).
// A miniatura e o palco mostram a imagem inteira, na proporcao dela.

import { CATALOGO } from '../jogo/catalogo.js';
import { criarPalco } from '../render/palco.js';
import { imagensDoGato, miniaturaDoGato } from '../render/imagens.js';

/** @typedef {import('../jogo/catalogo.js').Gato} Gato */

/** Folga em volta da foto no palco do album, para a figurinha ter onde mexer. */
const FOLGA_FOTO = 0.07;

/** @param {CanvasImageSource} img */
function medidas(img) {
  const i = /** @type {any} */ (img);
  return { w: i.naturalWidth || i.width || 1, h: i.naturalHeight || i.height || 1 };
}

export const COR_RARIDADE = Object.freeze({ comum: '#8E9BB8', raro: '#2F9BFF', epico: '#A64BFF', lendario: '#FFB000' });

const SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>';
const XIS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

/**
 * @param {{ textos: Record<string, string>, idioma: 'en'|'pt'|'es',
 *   aoAbrir: () => void, aoFechar: () => void, aoReagir: (g: Gato) => void }} o
 */
export function criarAlbum(o) {
  const T = o.textos;
  const painel = document.createElement('div');
  painel.id = 'album';
  painel.className = 'painel';
  painel.hidden = true;
  painel.innerHTML = `
    <div class="cartao" role="dialog" aria-modal="true" aria-labelledby="aTitulo">
      <div class="cabeca">
        <button id="aVoltar" class="btn redondo pequeno" hidden>${SETA}</button>
        <h2 id="aTitulo"></h2>
        <span id="aConta" class="conta"></span>
        <button id="aFechar" class="btn redondo pequeno">${XIS}</button>
      </div>
      <div class="grade" id="aGrade"></div>
      <div class="palco" id="aPalco" hidden>
        <canvas id="aTela"></canvas>
        <div class="legenda"><span id="aRaridade" class="chip"></span><b id="aNome"></b></div>
        <p class="toque" id="aToque"></p>
      </div>
    </div>`;
  document.body.appendChild(painel);
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (painel.querySelector(s));
  const grade = $('#aGrade');
  const vistaPalco = $('#aPalco');
  const tela = /** @type {HTMLCanvasElement} */ ($('#aTela'));
  const btVoltar = $('#aVoltar');
  const palco = criarPalco();
  /** @type {null|{ gato: Gato, im: import('../render/imagens.js').Imagens }} */
  let aberto = null;
  let laco = 0;
  let pedido = 0;

  $('#aFechar').setAttribute('aria-label', T.fechar);
  btVoltar.setAttribute('aria-label', T.fechar);
  $('#aTitulo').textContent = T.album;
  $('#aToque').textContent = T.repetir;

  /** @param {HTMLCanvasElement} cv @param {Gato} g @param {boolean} livre */
  function desenharFigurinha(cv, g, livre) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 96;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(w * dpr);
    const c = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cor = COR_RARIDADE[g.raridade];
    if (!livre) {
      const gr = c.createLinearGradient(0, 0, 0, w);
      gr.addColorStop(0, cor);
      gr.addColorStop(1, '#2A2238');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, w);
      c.font = `700 ${Math.round(w * 0.5)}px Fredoka, system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = 'rgba(255,255,255,.85)';
      c.fillText('?', w / 2, w * 0.54);
      return;
    }
    miniaturaDoGato(g).then((img) => {
      const m = medidas(img);
      const k = Math.min(w / m.w, w / m.h);
      c.drawImage(img, (w - m.w * k) / 2, (w - m.h * k) / 2, m.w * k, m.h * k);
    });
  }

  /** @param {Set<string>} livres @param {Set<string>} novos */
  function montarGrade(livres, novos) {
    grade.innerHTML = '';
    for (const g of CATALOGO) {
      const livre = livres.has(g.id);
      const b = document.createElement('button');
      b.className = `figurinha ${g.raridade}${livre ? '' : ' bloqueada'}${novos.has(g.id) ? ' nova' : ''}`;
      b.style.setProperty('--rar', COR_RARIDADE[g.raridade]);
      b.setAttribute('aria-label', livre ? g.nome[o.idioma] : '?');
      b.innerHTML = `<canvas></canvas><span>${livre ? g.nome[o.idioma] : '???'}</span>`;
      grade.appendChild(b);
      desenharFigurinha(/** @type {HTMLCanvasElement} */ (b.querySelector('canvas')), g, livre);
      if (livre) b.addEventListener('click', () => abrirPalco(g));
    }
    $('#aConta').textContent = `${livres.size}/${CATALOGO.length}`;
  }

  function quadro() {
    if (!aberto) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = tela.clientWidth || 280;
    const h = tela.clientHeight || w;
    if (tela.width !== Math.round(w * dpr) || tela.height !== Math.round(h * dpr)) {
      tela.width = Math.round(w * dpr);
      tela.height = Math.round(h * dpr);
    }
    const c = /** @type {CanvasRenderingContext2D} */ (tela.getContext('2d'));
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const f = aberto.im.gato ? 0 : FOLGA_FOTO;
    palco.desenhar(c, aberto.im, { x: w * f, y: h * f, w: w * (1 - 2 * f), h: h * (1 - 2 * f) }, performance.now(), { raio: 16 });
    laco = requestAnimationFrame(quadro);
  }

  /** @param {Gato} g */
  async function abrirPalco(g) {
    const n = ++pedido;
    const im = await imagensDoGato(g);
    if (n !== pedido || painel.hidden) return;
    aberto = { gato: g, im };
    tela.style.aspectRatio = String(im.w / im.h);
    grade.hidden = true;
    vistaPalco.hidden = false;
    btVoltar.hidden = false;
    $('#aTitulo').textContent = '';
    const chip = $('#aRaridade');
    chip.textContent = T[g.raridade];
    chip.style.background = COR_RARIDADE[g.raridade];
    $('#aNome').textContent = g.nome[o.idioma];
    cancelAnimationFrame(laco);
    palco.iniciar(g, performance.now());
    o.aoReagir(g);
    laco = requestAnimationFrame(quadro);
  }

  function voltarGrade() {
    pedido++;
    aberto = null;
    cancelAnimationFrame(laco);
    palco.parar();
    vistaPalco.hidden = true;
    grade.hidden = false;
    btVoltar.hidden = true;
    $('#aTitulo').textContent = T.album;
  }

  tela.addEventListener('pointerdown', () => {
    if (!aberto) return;
    palco.iniciar(aberto.gato, performance.now());
    o.aoReagir(aberto.gato);
  });
  btVoltar.addEventListener('click', voltarGrade);
  $('#aFechar').addEventListener('click', () => api.fechar());
  painel.addEventListener('click', (e) => {
    if (e.target === painel) api.fechar();
  });

  const api = {
    get aberta() {
      return !painel.hidden;
    },
    /** @param {Set<string>} livres @param {Set<string>} [novos] */
    abrir(livres, novos = new Set()) {
      painel.hidden = false;
      voltarGrade();
      montarGrade(livres, novos);
      o.aoAbrir();
    },
    fechar() {
      if (painel.hidden) return;
      voltarGrade();
      painel.hidden = true;
      o.aoFechar();
    },
  };
  return api;
}
