// Processa a arte de arte/bruto/<id>/ para src/arte/<id>/ e regenera
// src/arte/manifesto.js. Usa o ImageMagick (magick) do sistema.
//
// Dois tipos de entrada por gato (o registro em arte/origem.json decide):
//
// 1. IA + edicao (ver docs/arte/guia.md):
//      arte/bruto/<id>/fundo.(png|jpg|jpeg|webp)  cenario sem o gato
//      arte/bruto/<id>/gato.(png|webp)            gato recortado, com transparencia
//      ou so arte/bruto/<id>/imagem.(png|jpg|...) cena inteira, sem recorte
//    Saida: fundo.webp e gato.webp (1024 px, quadrados) e mini.webp (256 px).
//    Registro: ferramenta, plano, prompt, data, edicoes.
//
// 2. "tipo": "original" (imagem entregue pronta, usada sem alteracao):
//      arte/bruto/<id>/imagem.(jpg|jpeg|png|webp)
//    Saida: o mesmo arquivo, copiado byte a byte (sem corte, sem recompressao,
//    sem tirar texto), mais a mini.webp com a imagem inteira para o album.
//    Registro: arquivo, fonte, data, edicoes (e sha256, conferido se houver).
//
// Uso: node tools/arte.mjs [--so=banana,oiia]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ } from './servir.mjs';
import { CATALOGO } from '../src/jogo/catalogo.js';

const TAM = 1024;
const MINI = 256;
/** Teto de bytes por arquivo (passou = aviso, nao erro). */
const TETO = { 'fundo.webp': 280 * 1024, 'gato.webp': 220 * 1024, 'mini.webp': 32 * 1024 };
/** Orcamento da carga inicial (3 primeiros niveis) em bytes. */
const ORCAMENTO_INICIAL = 1.5 * 1024 * 1024;
const CAMPOS_IA = ['ferramenta', 'plano', 'prompt', 'data', 'edicoes'];
const CAMPOS_ORIGINAL = ['arquivo', 'fonte', 'data', 'edicoes'];

const bruto = join(RAIZ, 'arte/bruto');
const destino = join(RAIZ, 'src/arte');
const so = (process.argv.find((a) => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean);
const falhas = [];
const avisos = [];

/** @param {string[]} args */
function magick(args) {
  const r = spawnSync('magick', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`magick ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

/** @param {string} dir @param {string} nome */
function achar(dir, nome) {
  for (const ext of ['png', 'webp', 'jpg', 'jpeg']) {
    const p = join(dir, `${nome}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

/** @param {string} arq */
function medidas(arq) {
  const [w, h, canais, orient] = magick(['identify', '-format', '%w %h %[channels] %[orientation]', `${arq}[0]`]).split(' ');
  return { w: Number(w), h: Number(h), alfa: /a/.test(canais || ''), girada: !!orient && !/^(Undefined|TopLeft)$/.test(orient) };
}

/** @param {string} arq */
const sha256 = (arq) => createHash('sha256').update(readFileSync(arq)).digest('hex');

let origem = {};
try {
  origem = JSON.parse(readFileSync(join(RAIZ, 'arte/origem.json'), 'utf8'));
} catch {
  origem = {};
}

const ids = existsSync(bruto) ? readdirSync(bruto).filter((n) => statSync(join(bruto, n)).isDirectory()) : [];
const conhecidos = new Set(CATALOGO.map((g) => g.id));
for (const id of ids) if (!conhecidos.has(id)) falhas.push(`arte/bruto/${id}: id fora do catalogo`);

/** @type {Record<string, { arq: string, gato: boolean }>} */
const manifesto = {};
/** ids que usam a imagem original do meme */
const originais = [];
for (const g of CATALOGO) {
  const dir = join(bruto, g.id);
  if (!existsSync(dir)) continue;
  const reg = /** @type {Record<string, string>} */ (origem[g.id] || {});
  const original = reg.tipo === 'original';
  const semCampo = (original ? CAMPOS_ORIGINAL : CAMPOS_IA).filter((c) => !reg[c] || !String(reg[c]).trim());
  if (semCampo.length) {
    falhas.push(`${g.id}: arte/origem.json sem ${semCampo.map((c) => `"${c}"`).join(', ')}`);
    continue;
  }
  const saida = join(destino, g.id);

  if (original) {
    const fonte = achar(dir, 'imagem');
    if (!fonte) {
      falhas.push(`${g.id}: falta imagem.(jpg|png|webp)`);
      continue;
    }
    if (achar(dir, 'fundo') || achar(dir, 'gato')) falhas.push(`${g.id}: tipo original leva so imagem.*, sem fundo ou gato`);
    if (reg.sha256 && reg.sha256 !== sha256(fonte)) falhas.push(`${g.id}: imagem diferente do sha256 registrado (o arquivo foi alterado?)`);
    const m = medidas(fonte);
    if (m.girada) avisos.push(`${g.id}: a imagem tem orientacao EXIF; o navegador gira na hora de mostrar`);
    const arq = `imagem${extname(fonte)}`;
    manifesto[g.id] = { arq, gato: false };
    originais.push(g.id);
    if (so.length && !so.includes(g.id)) continue;
    rmSync(saida, { recursive: true, force: true });
    mkdirSync(saida, { recursive: true });
    try {
      copyFileSync(fonte, join(saida, arq));
      if (sha256(fonte) !== sha256(join(saida, arq))) throw new Error('copia diferente do original');
      // miniatura inteira (sem corte), com o lado maior em MINI
      magick([fonte, '-auto-orient', '-strip', '-resize', `${MINI}x${MINI}>`, '-quality', '75', join(saida, 'mini.webp')]);
    } catch (e) {
      falhas.push(`${g.id}: ${/** @type {Error} */ (e).message}`);
    }
    continue;
  }

  const fundo = achar(dir, 'fundo') || achar(dir, 'imagem');
  const gato = achar(dir, 'gato');
  if (!fundo) {
    falhas.push(`${g.id}: falta fundo.png (ou imagem.png)`);
    continue;
  }
  const mf = medidas(fundo);
  if (Math.abs(mf.w - mf.h) / Math.max(mf.w, mf.h) > 0.02) avisos.push(`${g.id}: fundo nao e quadrado (${mf.w}x${mf.h}); cortei o centro`);
  if (Math.min(mf.w, mf.h) < TAM) avisos.push(`${g.id}: fundo menor que ${TAM} px (${mf.w}x${mf.h}); vai ampliar`);
  if (gato) {
    const mg = medidas(gato);
    if (!mg.alfa) falhas.push(`${g.id}: gato.png sem transparencia (precisa do recorte)`);
    if (Math.abs(mg.w / mg.h - mf.w / mf.h) > 0.02) falhas.push(`${g.id}: gato.png e fundo com proporcoes diferentes (precisam do mesmo enquadramento)`);
  }
  manifesto[g.id] = { arq: 'fundo.webp', gato: !!gato };
  if (so.length && !so.includes(g.id)) continue;
  rmSync(saida, { recursive: true, force: true });
  mkdirSync(saida, { recursive: true });
  const quadrado = ['-resize', `${TAM}x${TAM}^`, '-gravity', 'center', '-extent', `${TAM}x${TAM}`];
  try {
    magick([fundo, '-auto-orient', '-strip', '-alpha', 'off', ...quadrado, '-quality', '80', '-define', 'webp:method=6', join(saida, 'fundo.webp')]);
    if (gato) {
      magick([gato, '-auto-orient', '-strip', '-background', 'none', ...quadrado, '-quality', '85', '-define', 'webp:alpha-quality=90', '-define', 'webp:method=6', join(saida, 'gato.webp')]);
      magick([join(saida, 'fundo.webp'), join(saida, 'gato.webp'), '-composite', '-resize', `${MINI}x${MINI}`, '-quality', '75', join(saida, 'mini.webp')]);
    } else {
      magick([join(saida, 'fundo.webp'), '-resize', `${MINI}x${MINI}`, '-quality', '75', join(saida, 'mini.webp')]);
    }
  } catch (e) {
    falhas.push(`${g.id}: ${/** @type {Error} */ (e).message}`);
    continue;
  }
  for (const [nome, teto] of Object.entries(TETO)) {
    const p = join(saida, nome);
    if (existsSync(p) && statSync(p).size > teto) avisos.push(`${g.id}/${nome} com ${(statSync(p).size / 1024).toFixed(0)} KB (teto ${teto / 1024} KB)`);
  }
}

// arte que saiu do bruto sai da build
if (existsSync(destino)) {
  for (const n of readdirSync(destino)) {
    const p = join(destino, n);
    if (statSync(p).isDirectory() && !manifesto[n]) rmSync(p, { recursive: true, force: true });
  }
}

if (falhas.length) {
  process.stdout.write('FALHOU:\n  ' + falhas.join('\n  ') + '\n');
  process.exit(1);
}

const linhas = Object.entries(manifesto).map(([id, v]) => `  ${/^[a-z]+$/.test(id) ? id : `'${id}'`}: { arq: '${v.arq}', gato: ${v.gato} },`);
writeFileSync(join(destino, 'manifesto.js'), `// GERADO por tools/arte.mjs: nao edite a mao.
// Gatos com arte em src/arte/<id>/. Os outros usam o gato provisorio.
// arq: imagem base (fundo.webp da arte de IA, ou a imagem original do meme
// copiada sem alteracao). gato: true = tem a camada do gato recortada.

/** @type {Readonly<Record<string, { arq: string, gato: boolean }>>} */
export const COM_ARTE = Object.freeze({${linhas.length ? '\n' + linhas.join('\n') + '\n' : ''}});
`);

const tamanho = (/** @type {string} */ id, /** @type {string} */ nome) => {
  const p = join(destino, id, nome);
  return existsSync(p) ? statSync(p).size : 0;
};
const peso = (/** @type {string} */ id) => {
  const v = manifesto[id];
  return v ? tamanho(id, v.arq) + (v.gato ? tamanho(id, 'gato.webp') : 0) : 0;
};
let total = 0;
for (const id of Object.keys(manifesto)) total += peso(id) + tamanho(id, 'mini.webp');
const inicial = CATALOGO.slice(0, 3).reduce((s, g) => s + peso(g.id), 0);
if (inicial > ORCAMENTO_INICIAL) avisos.push(`carga inicial (3 primeiros niveis) com ${(inicial / 1024).toFixed(0)} KB, acima de ${ORCAMENTO_INICIAL / 1024} KB`);
if (originais.length) avisos.push(`${originais.length} gato(s) com a imagem original do meme (tipo original), sem licenca verificada: a Poki recusa IP de terceiros sem licenca`);
for (const a of avisos) process.stdout.write(`aviso: ${a}\n`);
process.stdout.write(`arte ok: ${Object.keys(manifesto).length}/${CATALOGO.length} gatos com arte, ${(total / 1024).toFixed(0)} KB no total, ${(inicial / 1024).toFixed(0)} KB nos 3 primeiros niveis\n`);
process.stdout.write(`manifesto: ${relative(RAIZ, join(destino, 'manifesto.js'))}\n`);
