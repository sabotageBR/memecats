// Imagens de cada gato: arte (src/arte/<id>/) quando o manifesto diz que
// existe, gato provisorio quando nao existe ou quando falha a carga.
// O manifesto evita pedir arquivo que nao existe (404 no console da Poki).
//
// Cada gato rende tres telas do mesmo tamanho: fundo, gato (transparente; null
// quando a arte veio sem recorte) e composta (fundo + gato), que e a imagem
// cortada em pecas. A imagem original de meme vem do tamanho que tiver (nada
// de corte): w x h e a proporcao dela.

import { COM_ARTE } from '../arte/manifesto.js';
import { gatoProvisorio, S } from './provisorio.js';

/**
 * @typedef {Object} Imagens
 * @property {CanvasImageSource} fundo
 * @property {CanvasImageSource|null} gato
 * @property {HTMLCanvasElement} composta
 * @property {number} w largura em pixels
 * @property {number} h altura em pixels
 * @property {boolean} provisoria
 */

/** Gatos inteiros na memoria (cada um sao ate tres telas de ~1 a 2 MP). */
const MAX_CACHE = 3;

/** @type {Map<string, Promise<Imagens>>} na ordem de uso: o primeiro sai antes */
const cache = new Map();

/** @param {string} url @returns {Promise<HTMLImageElement>} */
function carregarImg(url) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error(url));
    img.src = url;
  });
}

/** @param {CanvasImageSource} fundo @param {CanvasImageSource|null} gato @param {number} w @param {number} h */
function compor(fundo, gato, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
  c.drawImage(fundo, 0, 0, w, h);
  if (gato) c.drawImage(gato, 0, 0, w, h);
  return cv;
}

/** @param {{ id: string, cor: string }} g @returns {Imagens} */
function provisoria(g) {
  const p = gatoProvisorio(g);
  return { fundo: p.fundo, gato: p.gato, composta: compor(p.fundo, p.gato, S, S), w: S, h: S, provisoria: true };
}

/** @param {{ id: string, cor: string }} g @returns {Promise<Imagens>} */
async function carregar(g) {
  const info = COM_ARTE[g.id];
  if (!info) return provisoria(g);
  try {
    const base = new URL(`../arte/${g.id}/`, import.meta.url);
    const [fundo, gato] = await Promise.all([
      carregarImg(new URL(info.arq, base).href),
      info.gato ? carregarImg(new URL('gato.webp', base).href) : Promise.resolve(null),
    ]);
    const w = fundo.naturalWidth || S;
    const h = fundo.naturalHeight || S;
    return { fundo, gato, composta: compor(fundo, gato, w, h), w, h, provisoria: false };
  } catch {
    return provisoria(g);
  }
}

/** @type {Map<string, Imagens>} */
const prontas = new Map();

/**
 * Imagens do gato (com cache: pedir de novo devolve a mesma promessa).
 * Tambem serve de pre-carga: e so chamar e nao esperar.
 * @param {{ id: string, cor: string }} g
 * @returns {Promise<Imagens>}
 */
export function imagensDoGato(g) {
  let p = cache.get(g.id);
  if (p) cache.delete(g.id);
  else {
    p = carregar(g).then((im) => {
      if (cache.has(g.id)) prontas.set(g.id, im);
      return im;
    });
  }
  cache.set(g.id, p);
  while (cache.size > MAX_CACHE) {
    const velho = /** @type {string} */ (cache.keys().next().value);
    cache.delete(velho);
    prontas.delete(velho);
  }
  return p;
}

/** @type {Map<string, Promise<CanvasImageSource>>} */
const minis = new Map();
const MINI = 256;

/**
 * Miniatura do gato para o album (mini.webp da arte ou o provisorio desenhado
 * pequeno). Nao carrega a imagem inteira. A da imagem original de meme vem
 * inteira, na proporcao dela.
 * @param {{ id: string, cor: string }} g
 * @returns {Promise<CanvasImageSource>}
 */
export function miniaturaDoGato(g) {
  let p = minis.get(g.id);
  if (!p) {
    const provisoria = () => {
      const pr = gatoProvisorio(g, MINI);
      return compor(pr.fundo, pr.gato, MINI, MINI);
    };
    p = COM_ARTE[g.id]
      ? carregarImg(new URL(`../arte/${g.id}/mini.webp`, import.meta.url).href).catch(provisoria)
      : Promise.resolve(provisoria());
    minis.set(g.id, p);
  }
  return p;
}

/** Imagens ja carregadas, sem esperar (null se ainda nao). @param {string} id */
export function imagensProntas(id) {
  return prontas.get(id) || null;
}

/**
 * A imagem reduzida a k x k pixels por peca (RGBA), para achar pecas iguais
 * (ver jogo/iguais.js).
 * @param {Imagens} im @param {number} cols @param {number} lins @param {number} k
 * @returns {Uint8ClampedArray}
 */
export function amostraDasPecas(im, cols, lins, k) {
  const cv = document.createElement('canvas');
  cv.width = cols * k;
  cv.height = lins * k;
  const c = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d', { willReadFrequently: true }));
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(im.composta, 0, 0, cv.width, cv.height);
  return c.getImageData(0, 0, cv.width, cv.height).data;
}

/**
 * Maior retangulo com a proporcao da imagem que cabe em w x h, no centro.
 * @param {Imagens} im @param {number} x @param {number} y @param {number} w @param {number} h
 */
export function encaixar(im, x, y, w, h) {
  const k = Math.min(w / im.w, h / im.h);
  const ew = im.w * k;
  const eh = im.h * k;
  return { x: x + (w - ew) / 2, y: y + (h - eh) / 2, w: ew, h: eh };
}
