// Ponto de entrada do Meme Cats Puzzle: liga tabuleiro, cena, entrada, HUD,
// som, album e Poki. Unico modulo que importa core/poki.js.
//
// Fluxo de um nivel: a imagem do gato aparece inteira e embaralha -> o jogador
// troca pecas (arraste ou toque-toque); peca certa trava e cola nas vizinhas
// certas; acertos seguidos sobem a nota sem fim e mostram o combo -> montada
// a imagem (PERFECT se nenhuma troca errou), o gato ganha vida com a reacao do
// meme e entra no album -> "proximo" -> intervalo comercial (a partir do nivel 4, a Poki
// decide a frequencia) -> proximo gato.

import { criarCena, PERFEITO_MS } from './render/cena.js';
import { calcularLayout } from './render/layout.js';
import { imagensDoGato, amostraDasPecas } from './render/imagens.js';
import { misturar } from './render/provisorio.js';
import { DURACAO } from './render/palco.js';
import { criarTabuleiro, trocar, certa, completo, dica, podeTrocar } from './jogo/tabuleiro.js';
import { gradeParaImagem, sementeDoNivel } from './jogo/curva.js';
import { classesIguais } from './jogo/iguais.js';
import { CATALOGO, gatoDoNivel, gatoPorId } from './jogo/catalogo.js';
import { criarAudio } from './core/audio.js';
import { criarArmazem } from './core/armazenamento.js';
import { escolherIdioma, textos } from './i18n/textos.js';
import { lerDepuracao } from './core/depuracao.js';
import { poki } from './core/poki.js';
import { criarAlbum, COR_RARIDADE } from './ui/album.js';

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const canvas = /** @type {HTMLCanvasElement} */ ($('cena'));
const cena = criarCena(canvas);
const audio = criarAudio();
const armazem = criarArmazem();
const dep = lerDepuracao();
const idioma = /** @type {'en'|'pt'|'es'} */ (escolherIdioma());
const T = textos(idioma);
const agora = () => performance.now();

/** Niveis sem intervalo comercial no comeco da sessao (primeiros minutos limpos). */
const NIVEIS_SEM_INTERVALO = 3;
const ESPIADA_MS = 2000;
/** O botao de proximo aparece depois que a reacao comeca. */
const PROXIMO_MS = 900;
/** Depois da reacao, o botao de proximo conta 2, 1 e passa sozinho. */
const CONTAGEM = 2;
/** Pixels por peca na amostra que acha pecas iguais (jogo/iguais.js). */
const AMOSTRA = 24;
/**
 * Lado menor minimo da peca (px CSS): a grade perde colunas ou linhas para
 * nao passar disso. No Player Fit Test da 0.1.0, o celular em pe abandonou
 * mais os niveis grandes, com pecas de ~58x50 px.
 */
const PECA_MIN = 56;
/**
 * Trocas seguidas sem travar que contam como "empacou". Na 1a vez do nivel o
 * Espiar recarrega e pulsa; da 2a em diante a mao mostra uma troca certa e a
 * Dica pulsa.
 */
const ERROS_AJUDA = 3;
/** Pecas que a Dica (video) coloca. */
const PECAS_DICA = 3;

const VERSAO_SAVE = 1;
const salvo = armazem.ler('save', null);
/** @type {{ v: number, nivel: number, mudo: boolean, gatos: string[], vistos: number }} */
const save = salvo && salvo.v === VERSAO_SAVE && Array.isArray(salvo.gatos)
  ? salvo
  : { v: VERSAO_SAVE, nivel: 1, mudo: false, gatos: [], vistos: 0 };
// gatos que sairam do catalogo nao contam no album
save.gatos = save.gatos.filter((id) => gatoPorId(id));
save.vistos = Math.min(save.vistos || 0, save.gatos.length);

/** @typedef {import('./jogo/tabuleiro.js').Tabuleiro} Tabuleiro */
/** @typedef {import('./jogo/catalogo.js').Gato} Gato */
const J = {
  nivel: dep.nivel || save.nivel || 1,
  /** @type {Tabuleiro|null} */
  tab: null,
  /** @type {Gato} */
  gato: CATALOGO[0],
  /** @type {import('./render/imagens.js').Imagens|null} */
  im: null,
  /** 'carregando' | 'entrando' | 'jogando' | 'revelando' | 'trocando' */
  fase: 'carregando',
  /** @type {number|null} */
  sel: null,
  /** @type {null|{ c: number, x: number, y: number, dx: number, dy: number, arrastando: boolean, desmarcar: boolean, alvo: number }} */
  toque: null,
  gen: 0,
  carregou: false,
  espiou: false,
  dicas: 0,
  /** acertos seguidos: trocas que travaram (som sem fim e selo de combo) */
  seq: 0,
  /** alguma troca do nivel nao travou nada (sem PERFECT) */
  errou: false,
  /** trocas seguidas que nao travaram (ERROS_AJUDA = empacou) */
  erros: 0,
  /** vezes que o jogador empacou neste nivel (a 1a e medida) */
  empaques: 0,
  /** contador do proximo: 0 nao comecou, -1 parado pelo jogador, >0 id do que esta correndo */
  conta: 0,
  /** ms entre trocas do jogador automatico (0 = desligado) */
  auto: dep.auto,
};

function salvar() {
  armazem.gravar('save', { v: VERSAO_SAVE, nivel: J.nivel, mudo: audio.mudo, gatos: save.gatos, vistos: save.vistos });
}

/** Agenda que morre com a troca de nivel. */
function depois(/** @type {number} */ ms, /** @type {() => void} */ fn) {
  const g = J.gen;
  setTimeout(() => {
    if (g === J.gen) fn();
  }, Math.max(0, ms));
}

/** Vibracao curta (celulares que suportam). @param {number|number[]} ms */
function vibrar(ms) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch { /* ignora */ }
}

// ------------------------------------------------------------------ layout
/**
 * Layout do quadro nesta tela. Sem argumentos, para o tabuleiro e a imagem
 * atuais; com eles, para escolher a grade antes de criar o tabuleiro.
 * @param {number} [cols] @param {number} [lins] @param {number} [proporcao]
 */
function medirLayout(cols, lins, proporcao) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const topo = $('topo').getBoundingClientRect();
  const base = $('base').getBoundingClientRect();
  const coluna = base.height > base.width;
  const tab = /** @type {Tabuleiro} */ (J.tab);
  return calcularLayout({
    W, H,
    topo: topo.bottom + 4,
    base: coluna ? H - 8 : base.top - 6,
    direita: coluna ? W - base.left + 4 : 0,
    cols: cols ?? tab.cols,
    lins: lins ?? tab.lins,
    proporcao: proporcao ?? (J.im ? J.im.w / J.im.h : 1),
  });
}

function redimensionar() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cena.redimensionar(window.innerWidth, window.innerHeight, dpr);
  if (J.tab && J.im) cena.configurar(J.tab, medirLayout(), J.im, J.gato);
}

// -------------------------------------------------------------------- HUD
const livres = () => new Set(dep.todos ? CATALOGO.map((g) => g.id) : save.gatos);

function atualizarHud(pop = false) {
  const placa = $('placa');
  const revelado = J.fase === 'revelando' || J.fase === 'trocando';
  placa.classList.toggle('revelado', revelado);
  if (revelado) {
    $('placaRotulo').textContent = T[J.gato.raridade];
    $('placaNum').textContent = J.gato.nome[idioma];
    placa.style.setProperty('--rar', COR_RARIDADE[J.gato.raridade]);
  } else {
    $('placaRotulo').textContent = T.nivel;
    $('placaNum').textContent = String(J.nivel);
    $('placaNovo').hidden = true;
  }
  if (pop) {
    placa.classList.remove('pop');
    void placa.offsetWidth;
    placa.classList.add('pop');
  }
  $('bEspiar').hidden = revelado;
  $('bDica').hidden = revelado;
  /** @type {HTMLButtonElement} */ ($('bEspiar')).disabled = J.espiou;
  for (const [id, chave] of [['bEspiar', 'espiar'], ['bDica', 'dica'], ['bSom', 'som'], ['bAlbum', 'album'], ['bProximo', 'proximo']]) {
    $(id).setAttribute('aria-label', T[chave]);
    $(id).title = T[chave];
  }
  $('placaNovo').textContent = T.novo;
  const som = $('bSom');
  som.querySelectorAll('.ligado').forEach((e) => { /** @type {SVGElement} */ (e).style.display = audio.mudo ? 'none' : ''; });
  /** @type {SVGElement} */ (som.querySelector('.desligado')).style.display = audio.mudo ? '' : 'none';
  if (audio.mudo) /** @type {SVGElement} */ (som.querySelector('.ligado')).style.display = '';
  const n = livres().size;
  $('bAlbum').style.setProperty('--prog', String(n / CATALOGO.length));
  $('bAlbum').classList.toggle('novidade', save.gatos.length > save.vistos);
}

/** O HUD segue o gato: fundo da pagina e cor de acento. @param {Gato} g */
function aplicarCor(g) {
  document.body.style.background = misturar(g.cor, '#1A1030', 0.35);
  document.documentElement.style.setProperty('--acento', misturar(g.cor, '#2A2238', 0.12));
  document.documentElement.style.setProperty('--placa', misturar(g.cor, '#1A1030', 0.35));
}

/** Estalo curto num botao (o Espiar que voltou). @param {HTMLElement} el */
function estalar(el) {
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

/** @param {string} txt @param {number} ms */
function avisar(txt, ms) {
  const a = $('aviso');
  a.textContent = txt;
  a.hidden = false;
  depois(ms, () => { a.hidden = true; });
}

// ------------------------------------------------------------------- nivel
/** @param {boolean} [mostrar] mostra a imagem inteira antes de embaralhar */
async function iniciarNivel(mostrar = true) {
  const g = ++J.gen;
  J.fase = 'carregando';
  $('bProximo').hidden = true;
  $('aviso').hidden = true;
  const escolha = gatoDoNivel(J.nivel);
  const gato = (dep.gato && gatoPorId(dep.gato)) || escolha.gato;
  const im = await imagensDoGato(gato);
  if (g !== J.gen) return;
  const prop = im.w / im.h;
  // a grade perde colunas ou linhas se a peca ficaria menor que PECA_MIN aqui
  const q = medirLayout(1, 1, prop);
  const { cols, lins } = gradeParaImagem(J.nivel, prop, { cols: q.iw / PECA_MIN, lins: q.ih / PECA_MIN });
  /** @type {number[]|undefined} */
  let classe;
  try {
    classe = classesIguais(amostraDasPecas(im, cols, lins, AMOSTRA), cols, lins, AMOSTRA);
  } catch { /* ignora: sem amostra, cada peca e unica */ }
  J.tab = criarTabuleiro(cols, lins, sementeDoNivel(J.nivel), classe);
  J.gato = gato;
  J.im = im;
  J.sel = null;
  J.toque = null;
  J.espiou = false;
  J.seq = 0;
  J.errou = false;
  J.erros = 0;
  J.empaques = 0;
  $('bDica').classList.remove('pulsar');
  $('bEspiar').classList.remove('pulsar');
  aplicarCor(gato);
  atualizarHud(true);
  cena.configurar(J.tab, medirLayout(), im, gato);
  J.fase = 'entrando';
  const ms = cena.entrada(agora(), !mostrar);
  depois(mostrar ? 720 : 0, () => audio.embaralhar());
  if (!J.carregou) {
    J.carregou = true;
    poki.gameLoadingFinished();
  }
  poki.measure('level', String(J.nivel), 'start');
  // pre-carga do proximo gato enquanto este e jogado
  imagensDoGato(gatoDoNivel(J.nivel + 1).gato);
  depois(ms + 30, () => {
    J.fase = 'jogando';
    if (dep.revelar) {
      resolverNaHora();
      return;
    }
    if (J.nivel <= 2) mostrarMao();
    if (J.auto) depois(J.auto, passoAuto);
    // botoes de ajuda a vista (Interaction Events: visible contra interact)
    poki.measure('button', 'peek', 'visible');
    if (poki.sdkPronto) poki.measure('button', 'hint', 'visible');
  });
}

/**
 * O jogador empacou. Na 1a vez do nivel, o Espiar (gratis) recarrega e pulsa;
 * da 2a em diante, a mao mostra uma troca certa e a Dica pulsa (o video segue
 * so por escolha).
 */
function ajudar() {
  J.erros = 0;
  if (++J.empaques === 1) {
    poki.measure('level', String(J.nivel), 'stuck');
    if (J.espiou) {
      J.espiou = false;
      atualizarHud();
      estalar($('bEspiar'));
      poki.measure('button', 'peek', 'visible');
    }
    $('bEspiar').classList.add('pulsar');
    return;
  }
  mostrarMao();
  $('bDica').classList.add('pulsar');
}

function mostrarMao() {
  const d = J.tab && dica(J.tab);
  if (d) cena.mostrarMao({ de: d.a, para: d.b }, agora());
}

/** @param {number} a @param {number} b */
function executar(a, b) {
  const tab = /** @type {Tabuleiro} */ (J.tab);
  const travou = trocar(tab, a, b);
  J.sel = null;
  cena.selecionar(null);
  cena.marcarAlvo(-1);
  if (!travou) {
    cena.sincronizar(agora());
    cena.tremer(b, agora());
    audio.erro();
    return;
  }
  cena.mostrarMao(null, agora());
  const ms = cena.sincronizar(agora());
  audio.trocar();
  depois(ms * 0.55, () => {
    if (travou.length) {
      J.seq++;
      J.erros = 0;
      $('bDica').classList.remove('pulsar');
      $('bEspiar').classList.remove('pulsar');
      cena.travou(travou, agora());
      audio.travar(J.seq, travou.length > 1);
      if (J.seq >= 2) cena.combo(J.seq, travou, agora());
      vibrar(12);
    } else {
      J.seq = 0;
      J.errou = true;
      if (++J.erros >= ERROS_AJUDA) ajudar();
    }
    if (completo(tab)) {
      J.fase = 'revelando';
      depois(260, completar);
      return;
    }
    // nos niveis de ensino, a mao volta se o jogador ficar parado
    if (J.nivel <= 2) {
      const n = tab.jogadas;
      depois(2500, () => {
        if (J.fase === 'jogando' && !cena.temMao && tab.jogadas === n && !J.toque && J.sel === null) mostrarMao();
      });
    }
  });
}

function completar() {
  J.fase = 'revelando';
  J.toque = null;
  J.conta = 0;
  poki.measure('level', String(J.nivel), 'complete');
  poki.gameplayStop();
  const novo = !save.gatos.includes(J.gato.id);
  if (novo) save.gatos.push(J.gato.id);
  salvar();
  if (J.errou) {
    revelarGato(novo);
    return;
  }
  // nivel sem erro: o PERFECT bate na tela e a revelacao espera por ele
  cena.perfeito(agora());
  audio.perfeito();
  vibrar([20, 40, 20, 40, 30]);
  depois(PERFEITO_MS, () => revelarGato(novo));
}

/** O gato ganha vida com a reacao e o botao de proximo aparece. @param {boolean} novo */
function revelarGato(novo) {
  const ms = cena.revelar(agora());
  audio.vitoria();
  vibrar([18, 60, 28]);
  depois(ms, () => audio.reagir(J.gato.reacao));
  atualizarHud(true);
  $('placaNovo').hidden = !novo;
  const dur = (/** @type {Record<string, number>} */ (DURACAO)[J.gato.reacao] || 2) * 1000;
  depois(ms + PROXIMO_MS, () => {
    const b = $('bProximo');
    b.hidden = false;
    b.classList.remove('pulsar', 'contando');
  });
  depois(ms + dur + 300, () => {
    avisar(T.repetir, 2600);
    contar();
  });
  if (J.auto) depois(ms + Math.min(dur, 900), proximo);
}

let contagens = 0;

/**
 * O botao de proximo conta 2, 1 e passa de nivel sozinho. Nao comeca se o
 * jogador ja mexeu no gato (ou abriu o album, ou saiu da aba): ai o botao so
 * pulsa, como antes.
 */
function contar() {
  const b = $('bProximo');
  if (J.fase !== 'revelando' || J.conta < 0 || J.auto || album.aberta || document.hidden) {
    b.classList.add('pulsar');
    return;
  }
  const id = ++contagens;
  J.conta = id;
  b.classList.remove('pulsar');
  b.classList.add('contando');
  const num = $('contaNum');
  const passo = (/** @type {number} */ n) => {
    if (J.conta !== id || J.fase !== 'revelando') return;
    if (n === 0) {
      proximo();
      return;
    }
    num.textContent = String(n);
    // reinicia o pulo do numero
    num.classList.remove('pop');
    void num.offsetWidth;
    num.classList.add('pop');
    audio.tique();
    depois(1000, () => passo(n - 1));
  };
  passo(CONTAGEM);
}

/** O jogador mexeu depois de montar: o contador para e o botao volta a pulsar. */
function pararContagem() {
  if (J.fase !== 'revelando') return;
  const contava = J.conta > 0;
  J.conta = -1;
  const b = $('bProximo');
  b.classList.remove('contando');
  if (contava) b.classList.add('pulsar');
}

async function proximo() {
  if (J.fase !== 'revelando') return;
  J.fase = 'trocando';
  $('bProximo').hidden = true;
  J.nivel++;
  salvar();
  // intervalo comercial na pausa natural entre niveis (a Poki decide se mostra)
  if (J.nivel - 1 >= NIVEIS_SEM_INTERVALO && !dep.semAnuncio) {
    const g = J.gen;
    await poki.commercialBreak();
    if (g !== J.gen) return;
  }
  iniciarNivel(!dep.fixo);
}

/** Resolve o nivel na hora (prints da revelacao, sem o PERFECT na frente). */
function resolverNaHora() {
  const tab = /** @type {Tabuleiro} */ (J.tab);
  for (let d = dica(tab); d; d = dica(tab)) trocar(tab, d.a, d.b);
  cena.sincronizar(agora());
  J.errou = true;
  completar();
}

// ------------------------------------------------------------- recompensa
/**
 * Video recompensado, so por escolha do jogador. Premio so com true. Em
 * desenvolvimento local sem SDK, libera direto para dar para testar.
 * @returns {Promise<boolean>}
 */
async function recompensa() {
  if (poki.sdkPronto) return poki.rewardedBreak();
  return dep.local;
}

// ------------------------------------------------------------------ acoes
function espiar() {
  if (J.fase !== 'jogando' || J.espiou) return;
  J.espiou = true;
  $('bEspiar').classList.remove('pulsar');
  cena.espiar(agora(), ESPIADA_MS);
  audio.espiar();
  poki.measure('button', 'peek', 'interact');
  atualizarHud();
}

async function dicaComVideo() {
  if (J.fase !== 'jogando') return;
  poki.measure('button', 'hint', 'interact');
  const g = J.gen;
  if (!(await recompensa()) || g !== J.gen || J.fase !== 'jogando') return;
  const d = J.tab && dica(J.tab);
  if (!d) return;
  J.dicas++;
  $('bDica').classList.remove('pulsar');
  J.sel = null;
  cena.selecionar(null);
  cena.mostrarMao({ de: d.a, para: d.b }, agora());
  // a mao aponta a 1a troca; depois o jogo faz PECAS_DICA trocas certas seguidas
  const passo = (/** @type {number} */ falta, /** @type {number} */ ms) => depois(ms, () => {
    if (J.fase !== 'jogando' || !J.tab) return;
    const d2 = dica(J.tab);
    if (!d2) return;
    executar(d2.a, d2.b);
    if (falta > 1) passo(falta - 1, 500);
  });
  passo(PECAS_DICA, 900);
}

const album = criarAlbum({
  textos: T,
  idioma,
  aoAbrir() {
    pararContagem();
    poki.gameplayStop();
    save.vistos = save.gatos.length;
    salvar();
    atualizarHud();
  },
  aoFechar() {},
  aoReagir(g) {
    audio.reagir(g.reacao);
  },
});

// ----------------------------------------------------------------- entrada
/** @param {PointerEvent} e */
function ponto(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

/** @param {number} c */
function livre(c) {
  return !!J.tab && c >= 0 && !certa(J.tab, c);
}

function desmarcar() {
  J.sel = null;
  cena.selecionar(null);
}

canvas.addEventListener('pointerdown', (e) => {
  audio.iniciar();
  const p = ponto(e);
  if (J.fase === 'revelando') {
    if (!cena.noQuadro(p.x, p.y)) return;
    // so para o contador quem repete a reacao: um toque durante o PERFECT
    // (o gato ainda nao reagiu) nao conta como mexer no gato
    if (cena.reagir(agora())) {
      pararContagem();
      audio.reagir(J.gato.reacao);
      $('aviso').hidden = true;
    }
    return;
  }
  if (J.fase !== 'jogando' || !J.tab) return;
  // so com input real do jogador (regra do Inspector da Poki)
  poki.gameplayStart();
  const lay = cena.layout;
  if (!lay) return;
  const c = lay.celulaEm(p.x, p.y);
  if (c < 0) {
    desmarcar();
    return;
  }
  if (!livre(c)) {
    cena.tremer(c, agora());
    audio.toc();
    return;
  }
  // segundo toque: troca com a selecionada
  if (J.sel !== null && J.sel !== c) {
    executar(J.sel, c);
    return;
  }
  const r = lay.celula(c);
  if (J.sel === c) {
    J.toque = { c, x: p.x, y: p.y, dx: r.x + r.w / 2 - p.x, dy: r.y + r.h / 2 - p.y, arrastando: false, desmarcar: true, alvo: -1 };
  } else {
    J.sel = c;
    cena.selecionar(c);
    audio.pegar();
    J.toque = { c, x: p.x, y: p.y, dx: r.x + r.w / 2 - p.x, dy: r.y + r.h / 2 - p.y, arrastando: false, desmarcar: false, alvo: -1 };
  }
  cena.mostrarMao(null, agora());
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch { /* ignora */ }
});

canvas.addEventListener('pointermove', (e) => {
  const tq = J.toque;
  if (!tq || J.fase !== 'jogando') return;
  const p = ponto(e);
  const lay = cena.layout;
  if (!lay) return;
  if (!tq.arrastando && Math.hypot(p.x - tq.x, p.y - tq.y) > Math.min(10, lay.pw * 0.15)) {
    tq.arrastando = true;
    tq.desmarcar = false;
  }
  if (!tq.arrastando) return;
  cena.arrastar({ c: tq.c, x: p.x + tq.dx * 0.5, y: p.y + tq.dy * 0.5 - lay.ph * 0.08 }, agora());
  const alvo = lay.celulaEm(p.x, p.y);
  tq.alvo = alvo !== tq.c && J.tab && podeTrocar(J.tab, tq.c, alvo) ? alvo : -1;
  cena.marcarAlvo(tq.alvo);
});

function soltar() {
  const tq = J.toque;
  if (!tq) return;
  J.toque = null;
  if (J.fase !== 'jogando') return;
  if (tq.arrastando) {
    cena.arrastar(null, agora());
    cena.marcarAlvo(-1);
    if (tq.alvo >= 0) {
      executar(tq.c, tq.alvo);
      return;
    }
    desmarcar();
    cena.sincronizar(agora());
    return;
  }
  if (tq.desmarcar) desmarcar();
}
canvas.addEventListener('pointerup', soltar);
canvas.addEventListener('pointercancel', soltar);

/** Botoes do HUD tambem contam como input real para o gameplayStart. */
function botao(/** @type {string} */ id, /** @type {() => void} */ fn) {
  $(id).addEventListener('click', () => {
    audio.iniciar();
    if (J.fase === 'jogando' && !album.aberta) poki.gameplayStart();
    fn();
  });
}
botao('bEspiar', espiar);
botao('bDica', dicaComVideo);
botao('bSom', () => {
  audio.definirMudo(!audio.mudo);
  salvar();
  atualizarHud();
});
$('bProximo').addEventListener('click', () => {
  audio.iniciar();
  proximo();
});
$('bAlbum').addEventListener('click', () => {
  audio.iniciar();
  const novos = new Set(save.gatos.slice(save.vistos));
  album.abrir(livres(), novos);
});

// som para quando a aba some (a Poki cobra isso)
document.addEventListener('visibilitychange', () => {
  audio.pausarAba(document.hidden);
  // o contador nao passa de nivel com a aba escondida
  if (document.hidden) pararContagem();
});

// --------------------------------------------------------------- quadro
function quadro() {
  cena.desenhar(agora());
  requestAnimationFrame(quadro);
}

// --------------------------------------------------------------- teste
function passoAuto() {
  if (J.fase !== 'jogando' || !J.tab || completo(J.tab)) return;
  const d = dica(J.tab);
  if (!d) return;
  executar(d.a, d.b);
  depois(J.auto, passoAuto);
}

// ---------------------------------------------------------------- inicio
poki.onAdStart = () => audio.mudoParaAnuncio();
poki.onAdEnd = () => audio.voltarDoAnuncio();
poki.init().then(() => {
  // sem SDK (bloqueador) nao ha video, entao os botoes de video somem
  if (!poki.sdkPronto && !dep.local) document.body.classList.add('sem-anuncio');
});
audio.definirMudo(!!save.mudo);
try {
  document.fonts.load('700 24px Fredoka');
} catch { /* ignora */ }
window.addEventListener('resize', redimensionar);
redimensionar();
iniciarNivel(!dep.fixo);
requestAnimationFrame(quadro);
if (dep.ganchos) {
  /** @type {any} */ (window).__mc = {
    J, cena, executar, poki, audio, proximo,
    /** joga sozinho, uma troca a cada ms, e passa de nivel */
    auto(ms = 200) {
      J.auto = ms;
      if (J.fase === 'jogando') passoAuto();
      else if (J.fase === 'revelando') proximo();
    },
  };
}
if (dep.album) $('bAlbum').click();
