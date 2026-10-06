// Grava a curadoria das imagens feita em tools/curadoria.html. O servidor
// local (tools/servir.mjs, so no 127.0.0.1) chama no POST /__curadoria.
//
// O pedido traz o catalogo inteiro como a pagina mostra:
// - ordem: os gatos que ficam, na ordem dos niveis (os do catalogo pelo id;
//   as imagens novas com titulo, fala, reacao, raridade, cor e os bytes);
// - excluir: gatos do catalogo que saem;
// - cortes e derivados: o retangulo de cada imagem e, do que mudou, o
//   recorte (JPEG) e a mini.webp, codificados pelo navegador.
// Tudo e conferido antes de gravar (o catalogo e a curva novos sao
// importados de uma copia em .tmp/). Depois:
// - src/jogo/catalogo.js recebe a ordem nova (as linhas que ja existiam vao
//   intactas; as novas sao geradas), src/jogo/curva.js termina no numero
//   novo de gatos e src/arte/manifesto.js e regenerado (tools/manifesto.mjs);
// - corte: o original em arte/bruto/<id>/ fica intacto; o retangulo vai para
//   arte/origem.json ("corte", px do original) e src/arte/<id>/imagem.jpg
//   recebe o recorte. Sem corte, volta a copia byte a byte;
// - imagem nova: arte/bruto/<id>/imagem.<ext> com os bytes como vieram e o
//   registro "tipo": "original" em arte/origem.json;
// - excluido: nada e apagado. arte/bruto/<id>/, o registro e a linha do
//   catalogo vao para arte/removidos/<id>/; src/arte/<id>/ sai da build.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { textoManifesto } from './manifesto.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ARQ = {
  origem: join(RAIZ, 'arte/origem.json'),
  catalogo: join(RAIZ, 'src/jogo/catalogo.js'),
  curva: join(RAIZ, 'src/jogo/curva.js'),
  manifesto: join(RAIZ, 'src/arte/manifesto.js'),
};
const BRUTO = join(RAIZ, 'arte/bruto');
const ARTE = join(RAIZ, 'src/arte');
const REMOVIDOS = join(RAIZ, 'arte/removidos');
/** imagens novas pendentes da primeira versao da curadoria */
const PENDENTES = join(RAIZ, 'arte/curadoria');
const ARQ_PENDENTES = join(RAIZ, 'arte/curadoria.json');
const TMP = join(RAIZ, '.tmp/curadoria');
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EXT = /^(jpg|png|webp)$/;
/** test/catalogo.test.js: nome de ate 22 letras em cada idioma */
const NOME_MAX = 22;
const FALA_MAX = 20;
const COR_PADRAO = '#8A8F99';
export const EDICOES_ORIGINAL = 'nenhuma: arquivo copiado byte a byte, a pedido do usuario';
export const EDICOES_CORTE = 'corte das bordas na curadoria (campo corte, em px do original); src/arte recebe o recorte em JPEG; o original em arte/bruto segue intacto';
const FONTE_NOVA = 'imagem enviada pelo usuario na curadoria (tools/curadoria.html); autoria e licenca nao verificadas';
const INICIO_CATALOGO = 'export const CATALOGO = Object.freeze([\n';
const INICIO_CURVA = 'export const CURVA = Object.freeze([\n';

/** @typedef {{ x: number, y: number, w: number, h: number }} Corte */

/** @param {unknown} c @returns {c is Corte} */
const corteValido = (c) => {
  const k = /** @type {Record<string, number>} */ (c);
  return !!k && ['x', 'y', 'w', 'h'].every((n) => Number.isInteger(k[n])) && k.x >= 0 && k.y >= 0 && k.w >= 16 && k.h >= 16;
};
/** @param {unknown} b64 */
const bytes = (b64) => Buffer.from(String(b64 || '').replace(/^data:[^,]*,/, ''), 'base64');
const ehJpeg = (/** @type {Buffer} */ b) => b.length > 4 && b[0] === 0xff && b[1] === 0xd8;
const ehWebp = (/** @type {Buffer} */ b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';
const ehPng = (/** @type {Buffer} */ b) => b.length > 8 && b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG';
/** @param {Buffer} b @param {string} ext */
const bateExt = (b, ext) => (ext === 'png' ? ehPng(b) : ext === 'webp' ? ehWebp(b) : ehJpeg(b));
/** @param {unknown} v @param {number} [max] */
const texto = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const sha256 = (/** @type {Buffer} */ b) => createHash('sha256').update(b).digest('hex');
/** texto entre aspas simples para o catalogo.js @param {string} s */
const aspas = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
/** importa sem o cache do node: os modulos do jogo mudam a cada curadoria @param {string} arq */
const fresco = (arq) => import(`${pathToFileURL(arq).href}?v=${Date.now()}-${Math.random()}`);
/** @param {string} dir */
const acharImagem = (dir) => ['jpg', 'jpeg', 'png', 'webp'].map((e) => join(dir, `imagem.${e}`)).find((p) => existsSync(p)) || null;

/**
 * Bloco de um Object.freeze([...]) do fonte: o que vem antes, as linhas e o resto.
 * @param {string} txt @param {string} inicio
 */
function bloco(txt, inicio) {
  const a = txt.indexOf(inicio);
  if (a < 0) throw new Error(`nao achei "${inicio.trim()}"`);
  const ini = a + inicio.length;
  const fim = txt.indexOf('\n]);', ini);
  if (fim < 0) throw new Error(`nao achei o fim de "${inicio.trim()}"`);
  return { antes: txt.slice(0, ini), linhas: txt.slice(ini, fim).split('\n'), depois: txt.slice(fim) };
}

/**
 * Curva para n gatos: a ultima faixa termina em n e as de antes encolhem so
 * o necessario para continuar crescendo (a mesma regra das remocoes a mao).
 * @param {readonly (readonly number[])[]} curva @param {number} n
 */
function curvaPara(curva, n) {
  const faixas = curva.map((f) => [...f]);
  faixas[faixas.length - 1][0] = n;
  for (let i = faixas.length - 2; i >= 0; i--) faixas[i][0] = Math.min(faixas[i][0], faixas[i + 1][0] - 1);
  return faixas.filter((f) => f[0] >= 1);
}

/**
 * @param {{ ordem?: any[], excluir?: string[], cortes?: Record<string, Corte|null>,
 *   derivados?: Record<string, { imagem?: string|null, mini: string }> }} pedido
 * @returns {Promise<{ ok: boolean, feitos: string[], erros: string[] }>}
 */
export async function salvarCuradoria(pedido) {
  const feitos = [];
  const erros = [];
  const { CATALOGO, REACOES, RARIDADES } = await fresco(ARQ.catalogo);
  const { CURVA } = await fresco(ARQ.curva);
  const { COM_ARTE } = await fresco(ARQ.manifesto);
  const origem = JSON.parse(readFileSync(ARQ.origem, 'utf8'));
  const doCatalogo = new Map(CATALOGO.map((/** @type {any} */ g) => [g.id, g]));
  const fonteCatalogo = bloco(readFileSync(ARQ.catalogo, 'utf8'), INICIO_CATALOGO);
  /** @type {Map<string, string>} linha de cada gato no catalogo.js */
  const linhas = new Map();
  for (const l of fonteCatalogo.linhas) {
    const m = /^ {2}g\('([a-z0-9-]+)',.*\),$/.exec(l);
    if (!m) return { ok: false, feitos, erros: [`linha inesperada no catalogo.js (esperava um gato por linha): ${l}`] };
    linhas.set(m[1], l);
  }

  // ---------------------------------------------- confere o pedido inteiro
  const excluir = new Set((pedido.excluir || []).map((id) => texto(id, 40)));
  const cortes = pedido.cortes || {};
  const derivados = pedido.derivados || {};
  /** @type {any[]} os gatos que ficam, na ordem nova */
  const final = [];
  const vistos = new Set();
  for (const x of pedido.ordem || []) {
    const id = texto(x && x.id, 40);
    if (vistos.has(id)) {
      erros.push(`${id}: aparece duas vezes na ordem`);
      continue;
    }
    vistos.add(id);
    if (!x.novo) {
      if (!doCatalogo.has(id)) erros.push(`${id}: nao esta no catalogo`);
      else if (excluir.has(id)) erros.push(`${id}: esta na ordem e na exclusao`);
      final.push({ id });
      continue;
    }
    const ext = texto(x.ext, 4).toLowerCase().replace('jpeg', 'jpg');
    const en = texto(x.nome && x.nome.en);
    const nome = { en, pt: texto(x.nome && x.nome.pt) || en, es: texto(x.nome && x.nome.es) || en };
    const fala = texto(x.fala);
    const raridade = x.raridade || 'comum';
    const dados = bytes(x.dados);
    if (!ID.test(id) || doCatalogo.has(id) || existsSync(join(BRUTO, id))) erros.push(`imagem nova "${id}": id invalido ou ja usado`);
    if (!en) erros.push(`${id}: falta o titulo em ingles`);
    for (const l of /** @type {const} */ (['en', 'pt', 'es'])) if (nome[l].length > NOME_MAX) erros.push(`${id}: titulo (${l}) com mais de ${NOME_MAX} letras`);
    if (fala.length > FALA_MAX) erros.push(`${id}: fala com mais de ${FALA_MAX} letras`);
    if (x.reacao && !REACOES.includes(x.reacao)) erros.push(`${id}: reacao desconhecida`);
    if (!RARIDADES.includes(raridade)) erros.push(`${id}: raridade desconhecida`);
    if (!EXT.test(ext) || !bateExt(dados, ext)) erros.push(`${id}: o arquivo nao e jpg, png ou webp`);
    final.push({
      id, novo: true, ext, nome, fala, raridade, dados,
      reacao: x.reacao || '',
      cor: /^#[0-9A-F]{6}$/i.test(String(x.cor)) ? String(x.cor).toUpperCase() : COR_PADRAO,
      arquivo: texto(x.arquivo, 120) || `${id}.${ext}`,
    });
  }
  for (const id of excluir) if (!doCatalogo.has(id)) erros.push(`${id}: so da para excluir gato do catalogo`);
  for (const g of CATALOGO) if (!vistos.has(g.id) && !excluir.has(g.id)) erros.push(`${g.id}: sumiu da ordem sem ser excluido`);
  if (final.length < REACOES.length) erros.push(`o jogo precisa de pelo menos ${REACOES.length} gatos`);
  // reacao automatica das novas: a menos usada entre os gatos que ficam
  /** @type {Record<string, number>} */
  const conta = Object.fromEntries(REACOES.map((/** @type {string} */ r) => [r, 0]));
  for (const x of final) {
    const r = x.novo ? x.reacao : doCatalogo.get(x.id).reacao;
    if (r) conta[r]++;
  }
  for (const x of final) {
    if (!x.novo || x.reacao) continue;
    x.reacao = REACOES.reduce((/** @type {string} */ a, /** @type {string} */ b) => (conta[b] < conta[a] ? b : a));
    x.reacaoAuto = true;
    conta[x.reacao]++;
  }
  const semReacao = REACOES.filter((/** @type {string} */ r) => !conta[r]);
  if (semReacao.length) erros.push(`nenhum gato ficaria com a reacao ${semReacao.join(', ')}`);
  for (const x of final) {
    const corte = cortes[x.id] ?? null;
    if (corte !== null && !corteValido(corte)) erros.push(`${x.id}: corte invalido`);
    x.corte = corte;
    const der = derivados[x.id];
    if (x.novo && !der) erros.push(`${x.id}: faltou a miniatura`);
    if (!der) continue;
    if (!x.novo) {
      const reg = origem[x.id];
      if (!reg || reg.tipo !== 'original' || !COM_ARTE[x.id] || COM_ARTE[x.id].gato || !acharImagem(join(BRUTO, x.id))) erros.push(`${x.id}: so corto imagem original de meme`);
    }
    x.mini = bytes(der.mini);
    if (!ehWebp(x.mini)) erros.push(`${x.id}: miniatura invalida`);
    if (corte) {
      x.recorte = bytes(der.imagem);
      if (!ehJpeg(x.recorte)) erros.push(`${x.id}: recorte invalido`);
    }
  }

  // catalogo e curva novos, conferidos importando a copia
  const n = final.length;
  const linhaNova = (/** @type {any} */ x) => `  g(${[x.id, x.nome.en, x.nome.pt, x.nome.es, x.raridade, x.reacao, x.cor].map(aspas).join(', ')}${x.fala ? `, ${aspas(x.fala)}` : ''}),`;
  const novoCatalogo = fonteCatalogo.antes + final.map((x) => (x.novo ? linhaNova(x) : linhas.get(x.id))).join('\n') + fonteCatalogo.depois;
  const fonteCurva = bloco(readFileSync(ARQ.curva, 'utf8'), INICIO_CURVA);
  const faixas = curvaPara(CURVA, n);
  const novaCurva = fonteCurva.antes + faixas.map((f) => `  [${f.join(', ')}],`).join('\n') + fonteCurva.depois;
  if (!erros.length) {
    try {
      mkdirSync(TMP, { recursive: true });
      writeFileSync(join(TMP, 'catalogo.js'), novoCatalogo);
      writeFileSync(join(TMP, 'curva.js'), novaCurva);
      const c = await fresco(join(TMP, 'catalogo.js'));
      const v = await fresco(join(TMP, 'curva.js'));
      if (c.CATALOGO.map((/** @type {any} */ g) => g.id).join() !== final.map((x) => x.id).join()) erros.push('o catalogo novo nao bate com a ordem pedida');
      if (v.CURVA[v.CURVA.length - 1][0] !== n) erros.push('a curva nova nao termina no ultimo gato');
    } catch (e) {
      erros.push(`o catalogo ou a curva novos nao carregam: ${/** @type {Error} */ (e).message}`);
    } finally {
      rmSync(TMP, { recursive: true, force: true });
    }
  }
  if (erros.length) return { ok: false, feitos, erros: ['nada foi gravado.', ...erros] };

  // ------------------------------------------------------------- grava
  const hoje = new Date().toISOString().slice(0, 10);
  /** @type {Record<string, { arq: string, gato: boolean }>} */
  const manifesto = {};
  for (const [i, x] of final.entries()) {
    if (x.novo) {
      const dir = join(BRUTO, x.id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `imagem.${x.ext}`), x.dados);
      origem[x.id] = { tipo: 'original', arquivo: x.arquivo, fonte: FONTE_NOVA, data: hoje, edicoes: EDICOES_ORIGINAL, sha256: sha256(x.dados) };
      feitos.push(`novo: ${x.id} no nivel ${i + 1} (${x.reacao}${x.reacaoAuto ? ', reacao automatica' : ''}, ${x.raridade})`);
    }
    let arq = COM_ARTE[x.id] ? COM_ARTE[x.id].arq : '';
    if (x.mini) {
      // recorte ou copia do original em src/arte, mais a miniatura
      const saida = join(ARTE, x.id);
      const fonte = /** @type {string} */ (acharImagem(join(BRUTO, x.id)));
      mkdirSync(saida, { recursive: true });
      for (const f of readdirSync(saida)) if (/^imagem\./.test(f)) rmSync(join(saida, f));
      if (x.corte) {
        arq = 'imagem.jpg';
        writeFileSync(join(saida, arq), x.recorte);
        origem[x.id].corte = { x: x.corte.x, y: x.corte.y, w: x.corte.w, h: x.corte.h };
        origem[x.id].edicoes = EDICOES_CORTE;
        feitos.push(`${x.id}: corte ${x.corte.w}x${x.corte.h} (+${x.corte.x}+${x.corte.y}), ${(x.recorte.length / 1024).toFixed(0)} KB`);
      } else {
        arq = `imagem${extname(fonte).replace('.jpeg', '.jpg')}`;
        copyFileSync(fonte, join(saida, arq));
        delete origem[x.id].corte;
        if (origem[x.id].edicoes === EDICOES_CORTE) origem[x.id].edicoes = EDICOES_ORIGINAL;
        if (!x.novo) feitos.push(`${x.id}: sem corte (original byte a byte)`);
      }
      writeFileSync(join(saida, 'mini.webp'), x.mini);
    }
    if (arq) manifesto[x.id] = { arq, gato: COM_ARTE[x.id] ? COM_ARTE[x.id].gato : false };
  }
  for (const id of excluir) {
    mkdirSync(REMOVIDOS, { recursive: true });
    let dest = join(REMOVIDOS, id);
    if (existsSync(dest)) dest = join(REMOVIDOS, `${id}-${Date.now()}`);
    if (existsSync(join(BRUTO, id))) renameSync(join(BRUTO, id), dest);
    else mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, 'origem.json'), JSON.stringify(origem[id] || {}, null, 2) + '\n');
    writeFileSync(join(dest, 'catalogo.txt'), `${linhas.get(id) || ''}\n`);
    delete origem[id];
    rmSync(join(ARTE, id), { recursive: true, force: true });
    feitos.push(`excluido: ${id} (arquivos guardados em arte/removidos/)`);
  }
  const antes = CATALOGO.map((/** @type {any} */ g) => g.id).filter((/** @type {string} */ id) => !excluir.has(id)).join();
  const depois = final.filter((x) => !x.novo).map((x) => x.id).join();
  if (antes !== depois) feitos.push('ordem dos niveis atualizada');
  writeFileSync(ARQ.catalogo, novoCatalogo);
  writeFileSync(ARQ.curva, novaCurva);
  writeFileSync(ARQ.manifesto, textoManifesto(manifesto));
  writeFileSync(ARQ.origem, JSON.stringify(origem, null, 2) + '\n');
  // pendentes da primeira versao da curadoria: agora entram direto
  rmSync(ARQ_PENDENTES, { force: true });
  rmSync(PENDENTES, { recursive: true, force: true });
  if (n !== CATALOGO.length) feitos.push(`${n} gatos no jogo (eram ${CATALOGO.length}); a curva termina no nivel ${n}`);
  return { ok: true, feitos, erros };
}
