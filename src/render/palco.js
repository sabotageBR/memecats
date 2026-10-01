// Palco do gato revelado: o fundo parado e o gato animado por cima com a
// reacao do meme, mais as particulas (lagrimas, notas, brilhos, fala...).
// Serve a revelacao no tabuleiro e a figurinha aberta no album.
//
// Imagem sem recorte (a foto do meme, usada como veio): a imagem inteira e a
// figurinha que faz a reacao, com o fundo do quadro aparecendo atras.
//
// A pose e funcao pura do tempo (segundos desde o inicio da reacao): da para
// testar e desenhar qualquer instante. As particulas nascem em instantes
// marcados da reacao, entao o som (core/audio.js) usa os mesmos instantes.

/** @typedef {import('../jogo/catalogo.js').Gato} Gato */
/** @typedef {import('./imagens.js').Imagens} Imagens */

/** Duracao de cada reacao em segundos (depois dela, o gato so respira). */
export const DURACAO = Object.freeze({ girar: 2.4, chorar: 2.6, pular: 1.9, susto: 1.6, balancar: 2.6, dancar: 2.6, pop: 1.9, brilhar: 2.0 });

/** Instantes das batidas de cada reacao (o som segue os mesmos). */
export const BATIDAS = Object.freeze({
  pular: [0, 0.62, 1.24],
  pop: [0, 0.36, 0.72, 1.08, 1.44],
  balancar: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25],
  dancar: [0, 0.3125, 0.625, 0.9375, 1.25, 1.5625, 1.875, 2.1875],
});

const TAU = Math.PI * 2;
const suave = (/** @type {number} */ x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * @typedef {Object} Pose
 * @property {number} dx deslocamento em fracoes da medida da imagem (raiz da area)
 * @property {number} dy
 * @property {number} sx escala
 * @property {number} sy
 * @property {number} rot radianos
 * @property {number} px pivo (0..1)
 * @property {number} py
 * @property {number[]} rastro escalas x de fantasmas (giro)
 */

/**
 * @param {string} reacao
 * @param {number} t segundos desde o inicio (negativo = parado)
 * @returns {Pose}
 */
export function pose(reacao, t) {
  /** @type {Pose} */
  const p = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, px: 0.5, py: 0.6, rastro: [] };
  const T = /** @type {Record<string, number>} */ (DURACAO)[reacao] || 2;
  if (t < 0 || t >= T) {
    // respiracao
    const r = Math.sin(TAU * 0.7 * Math.max(0, t - T));
    p.py = 0.9;
    p.sy = 1 + 0.012 * r;
    p.sx = 1 - 0.005 * r;
    return p;
  }
  const u = t / T;
  switch (reacao) {
    case 'girar': {
      const voltas = 6;
      const th = (/** @type {number} */ k) => TAU * voltas * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      const a = th(u);
      p.sx = Math.cos(a);
      if (Math.abs(p.sx) < 0.06) p.sx = 0.06 * Math.sign(p.sx || 1);
      p.dy = -0.025 * Math.abs(Math.sin(a / 2)) * Math.sin(Math.PI * u);
      p.rastro = [Math.cos(th(Math.max(0, u - 0.025))), Math.cos(th(Math.max(0, u - 0.05)))];
      break;
    }
    case 'chorar': {
      const s = Math.sin(TAU * 3 * t) * (1 - 0.5 * u);
      p.py = 0.9;
      p.sy = 1 + 0.03 * s;
      p.sx = 1 - 0.018 * s;
      p.rot = 0.025 * Math.sin(TAU * 1.2 * t);
      break;
    }
    case 'pular': {
      p.py = 0.9;
      const salto = 0.62;
      const k = Math.floor(t / salto);
      const v = (t - k * salto) / salto;
      const ar = 0.72;
      if (k < BATIDAS.pular.length && v < ar) {
        const w = v / ar;
        p.dy = -0.17 * 4 * w * (1 - w);
        p.sy = 1 + 0.08 * Math.sin(Math.PI * w);
        p.sx = 1 - 0.05 * Math.sin(Math.PI * w);
      } else {
        const w = (v - ar) / (1 - ar);
        const am = Math.sin(Math.PI * Math.min(1, w));
        p.sy = 1 - 0.14 * am;
        p.sx = 1 + 0.12 * am;
      }
      break;
    }
    case 'susto': {
      const soco = t < 0.08 ? suave(t / 0.08) : Math.exp(-6 * (t - 0.08)) * Math.cos(TAU * 2.2 * (t - 0.08));
      const s = 1 + 0.26 * soco;
      p.sx = s;
      p.sy = s;
      p.dx = 0.012 * Math.sin(TAU * 22 * t) * Math.exp(-3 * t);
      p.dy = -0.03 * Math.max(0, soco);
      break;
    }
    case 'balancar': {
      p.py = 0.9;
      p.rot = 0.14 * Math.sin(TAU * 2 * t);
      p.dy = -0.015 * Math.abs(Math.sin(TAU * 2 * t));
      break;
    }
    case 'dancar': {
      p.py = 0.9;
      p.dx = 0.075 * Math.sin(TAU * 1.6 * t);
      p.rot = -0.13 * Math.sin(TAU * 1.6 * t);
      const b = Math.abs(Math.sin(TAU * 1.6 * t));
      p.sy = 1 - 0.05 * (1 - b);
      p.sx = 1 + 0.03 * (1 - b);
      break;
    }
    case 'pop': {
      let b = 0;
      for (const tk of BATIDAS.pop) {
        const d = t - tk;
        if (d >= 0) b = Math.max(b, d < 0.05 ? d / 0.05 : Math.exp(-14 * (d - 0.05)));
      }
      p.sx = 1 + 0.16 * b;
      p.sy = 1 + 0.2 * b;
      p.py = 0.85;
      break;
    }
    case 'brilhar': {
      p.rot = 0.07 * Math.sin(TAU * 0.9 * t) * (1 - u * 0.5);
      const s = 1 + 0.05 * Math.sin(Math.PI * Math.min(1, t / 0.5));
      p.sx = s;
      p.sy = s;
      break;
    }
    default:
  }
  return p;
}

/** @typedef {{ x: number, y: number, w: number, h: number }} Retangulo */

/** Medida de referencia do retangulo (raiz da area). @param {Retangulo} r */
const medida = (r) => Math.sqrt(r.w * r.h);

/** Na foto sem recorte, o deslocamento e o giro sao menores (a imagem toda mexe). */
const AMPLITUDE_FOTO = 0.6;

/** @param {Pose} p @returns {Pose} */
function poseDaFoto(p) {
  return { ...p, dx: p.dx * AMPLITUDE_FOTO, dy: p.dy * AMPLITUDE_FOTO, rot: p.rot * AMPLITUDE_FOTO };
}

/** Leva um ponto da imagem (0..1) para a tela, com a pose aplicada. */
function transformar(/** @type {number} */ ux, /** @type {number} */ uy, /** @type {Pose} */ p, /** @type {Retangulo} */ r) {
  const L = medida(r);
  const x = (ux - p.px) * p.sx * r.w;
  const y = (uy - p.py) * p.sy * r.h;
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  return { x: r.x + p.px * r.w + p.dx * L + x * c - y * s, y: r.y + p.py * r.h + p.dy * L + x * s + y * c };
}

/**
 * @typedef {Object} Particula
 * @property {'lagrima'|'nota'|'texto'|'brilho'|'confete'} tipo
 * @property {number} x em px
 * @property {number} y
 * @property {number} vx px/s
 * @property {number} vy
 * @property {number} g gravidade px/s2
 * @property {number} t0 ms
 * @property {number} vida ms
 * @property {number} tam px
 * @property {string} cor
 * @property {number} rot
 * @property {number} vr
 * @property {string} [txt]
 */

const CORES_NOTA = ['#FF4FA0', '#3CC8FF', '#FFD23C', '#7CFF9A', '#B57BFF'];
const CORES_CONFETE = ['#FF4FA0', '#3CC8FF', '#FFD23C', '#7CFF9A', '#FF7B3C', '#B57BFF', '#FFFFFF'];

/** Palco com reacao e particulas. Um por canvas. */
export function criarPalco() {
  /** @type {Gato|null} */
  let gato = null;
  let t0 = -1;
  let tAnt = 0;
  let acumulado = 0;
  /** @type {Particula[]} */
  let parts = [];
  // aleatorio so de enfeite (particulas); a logica do jogo nao passa por aqui
  const rnd = Math.random;

  /** @param {Partial<Particula> & { tipo: Particula['tipo'], x: number, y: number }} p @param {number} agora */
  function emitir(p, agora) {
    parts.push({ vx: 0, vy: 0, g: 0, t0: agora, vida: 1000, tam: 20, cor: '#FFFFFF', rot: 0, vr: 0, ...p });
  }

  /**
   * Particulas que nascem entre tA e tB (segundos da reacao).
   * @param {number} tA @param {number} tB @param {Pose} ps @param {Retangulo} r @param {number} agora
   */
  function nascer(tA, tB, ps, r, agora) {
    if (!gato) return;
    const T = /** @type {Record<string, number>} */ (DURACAO)[gato.reacao] || 2;
    const L = medida(r);
    const cruzou = (/** @type {number} */ tk) => tk >= tA && tk < tB;
    const topo = transformar(0.5, 0.2, ps, r);
    if (gato.fala && cruzou(gato.reacao === 'susto' ? 0.04 : 0.12)) {
      emitir({ tipo: 'texto', x: topo.x + (rnd() - 0.5) * L * 0.1, y: topo.y - L * 0.04, vy: -L * 0.12, vida: 1500, tam: L * 0.13, cor: '#FFFFFF', txt: gato.fala, rot: (rnd() - 0.5) * 0.3 }, agora);
    }
    if (tB > T) return;
    acumulado += tB - tA;
    switch (gato.reacao) {
      case 'chorar':
        while (acumulado > 0.07) {
          acumulado -= 0.07;
          for (const [ox, oy] of gato.olhos) {
            const o = transformar(ox, oy + 0.04, ps, r);
            const lado = ox < 0.5 ? -1 : 1;
            emitir({ tipo: 'lagrima', x: o.x, y: o.y, vx: lado * L * (0.15 + rnd() * 0.25), vy: -L * (0.15 + rnd() * 0.2), g: L * 1.6, vida: 900, tam: L * (0.018 + rnd() * 0.012), cor: '#6EC1FF' }, agora);
          }
        }
        break;
      case 'balancar':
      case 'dancar':
        for (const tk of BATIDAS[gato.reacao]) {
          if (!cruzou(tk) || (gato.reacao === 'balancar' && Math.round(tk * 4) % 2)) continue;
          const lado = rnd() < 0.5 ? -1 : 1;
          const o = transformar(0.5 + lado * 0.28, 0.35, ps, r);
          emitir({ tipo: 'nota', x: o.x, y: o.y, vx: lado * L * 0.05, vy: -L * 0.22, vida: 1300, tam: L * (0.06 + rnd() * 0.03), cor: CORES_NOTA[Math.floor(rnd() * CORES_NOTA.length)], txt: rnd() < 0.5 ? '♪' : '♫', vr: lado * 0.8 }, agora);
        }
        acumulado = 0;
        break;
      case 'pop':
        for (const tk of BATIDAS.pop) {
          if (!cruzou(tk)) continue;
          const o = transformar(0.5, 0.58, ps, r);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + rnd() * 0.5;
            emitir({ tipo: 'brilho', x: o.x, y: o.y, vx: Math.cos(a) * L * 0.5, vy: Math.sin(a) * L * 0.5, vida: 420, tam: L * 0.025, cor: '#FFFFFF' }, agora);
          }
        }
        acumulado = 0;
        break;
      case 'pular':
        for (const tk of BATIDAS.pular) {
          if (!cruzou(tk + 0.62 * 0.72)) continue;
          for (let i = 0; i < 8; i++) {
            const lado = i % 2 ? 1 : -1;
            const o = transformar(0.5 + lado * 0.18, 0.92, ps, r);
            emitir({ tipo: 'brilho', x: o.x, y: o.y, vx: lado * L * (0.2 + rnd() * 0.3), vy: -L * (0.1 + rnd() * 0.25), g: L * 0.8, vida: 500, tam: L * 0.02, cor: '#FFFFFF' }, agora);
          }
        }
        acumulado = 0;
        break;
      case 'brilhar':
        while (acumulado > 0.12) {
          acumulado -= 0.12;
          const a = rnd() * TAU;
          const o = transformar(0.5 + Math.cos(a) * 0.33, 0.5 + Math.sin(a) * 0.33, ps, r);
          emitir({ tipo: 'brilho', x: o.x, y: o.y, vy: -L * 0.05, vida: 700, tam: L * (0.025 + rnd() * 0.025), cor: '#FFF4B0' }, agora);
        }
        if (cruzou(0.2) || cruzou(1.0)) {
          for (const [ox, oy] of gato.olhos) {
            const o = transformar(ox, oy, ps, r);
            emitir({ tipo: 'brilho', x: o.x, y: o.y, vida: 600, tam: L * 0.06, cor: '#FFFFFF' }, agora);
          }
        }
        break;
      case 'girar':
        while (acumulado > 0.05) {
          acumulado -= 0.05;
          const lado = rnd() < 0.5 ? -1 : 1;
          const o = transformar(0.5 + lado * 0.22, 0.4 + rnd() * 0.45, ps, r);
          emitir({ tipo: 'brilho', x: o.x, y: o.y, vx: lado * L * 0.5, vy: -L * 0.05, vida: 380, tam: L * 0.016, cor: 'rgba(255,255,255,.9)' }, agora);
        }
        break;
      case 'susto':
        if (cruzou(0.02)) {
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI * (0.1 + 0.8 * (i / 9));
            const o = transformar(0.5 + Math.cos(a) * 0.28, 0.42 + Math.sin(a) * 0.28, ps, r);
            emitir({ tipo: 'brilho', x: o.x, y: o.y, vx: Math.cos(a) * L * 0.35, vy: Math.sin(a) * L * 0.35, vida: 450, tam: L * 0.022, cor: '#FFFFFF' }, agora);
          }
        }
        acumulado = 0;
        break;
      default:
        acumulado = 0;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @param {Particula} p @param {number} agora */
  function desenharParticula(ctx, p, agora) {
    const idade = (agora - p.t0) / 1000;
    const k = (agora - p.t0) / p.vida;
    if (k >= 1 || k < 0) return;
    const x = p.x + p.vx * idade;
    const y = p.y + p.vy * idade + 0.5 * p.g * idade * idade;
    const alfa = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    ctx.rotate(p.rot + p.vr * idade);
    const t = p.tam;
    switch (p.tipo) {
      case 'lagrima':
        ctx.beginPath();
        ctx.moveTo(0, -t * 1.4);
        ctx.bezierCurveTo(t * 0.9, -t * 0.2, t, t, 0, t);
        ctx.bezierCurveTo(-t, t, -t * 0.9, -t * 0.2, 0, -t * 1.4);
        ctx.fillStyle = p.cor;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath();
        ctx.arc(-t * 0.3, 0, t * 0.25, 0, TAU);
        ctx.fill();
        break;
      case 'brilho': {
        const s = t * (k < 0.3 ? k / 0.3 : 1 - (k - 0.3) * 0.6);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const rr = i % 2 ? s * 0.28 : s;
          if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else ctx.moveTo(rr, 0);
        }
        ctx.closePath();
        ctx.fillStyle = p.cor;
        ctx.fill();
        break;
      }
      case 'confete':
        ctx.fillStyle = p.cor;
        ctx.scale(1, Math.cos(idade * 9 + p.vr));
        ctx.fillRect(-t / 2, -t / 4, t, t / 2);
        break;
      case 'nota':
      case 'texto': {
        const pop = p.tipo === 'texto' ? (k < 0.12 ? 0.5 + 0.7 * (k / 0.12) : k < 0.2 ? 1.2 - (k - 0.12) * 2.5 : 1) : 1;
        ctx.scale(pop, pop);
        ctx.font = `700 ${Math.round(t)}px Fredoka, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, t * 0.16);
        ctx.strokeStyle = '#2A2238';
        ctx.strokeText(p.txt || '', 0, 0);
        ctx.fillStyle = p.cor;
        ctx.fillText(p.txt || '', 0, 0);
        break;
      }
      default:
    }
    ctx.restore();
  }

  return {
    /** @param {Gato} g @param {number} agora */
    iniciar(g, agora) {
      gato = g;
      t0 = agora;
      tAnt = 0;
      acumulado = 0;
      parts = parts.filter((p) => p.tipo === 'confete');
    },
    /** Para a reacao (o gato fica respirando) e limpa as particulas. */
    parar() {
      gato = null;
      t0 = -1;
      parts = [];
    },
    /** segundos desde o inicio da reacao (-1 parado) @param {number} agora */
    tempo(agora) {
      return t0 < 0 ? -1 : (agora - t0) / 1000;
    },
    /** Chuva de confete sobre o retangulo. @param {Retangulo} r @param {number} agora */
    confete(r, agora) {
      const L = medida(r);
      for (let i = 0; i < 90; i++) {
        emitir({
          tipo: 'confete', x: r.x + rnd() * r.w, y: r.y - rnd() * r.h * 0.3,
          vx: (rnd() - 0.5) * L * 0.3, vy: L * (0.1 + rnd() * 0.3), g: L * 0.5,
          vida: 2200 + rnd() * 900, tam: L * (0.02 + rnd() * 0.015), cor: CORES_CONFETE[Math.floor(rnd() * CORES_CONFETE.length)],
          rot: rnd() * TAU, vr: rnd() * 6,
        }, agora);
      }
    },
    /**
     * Desenha fundo + gato com a pose do instante e as particulas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Imagens} im
     * @param {Retangulo} r
     * @param {number} agora ms (performance.now)
     * @param {{ raio?: number, alfa?: number }} [op]
     */
    desenhar(ctx, im, r, agora, op = {}) {
      const t = t0 < 0 ? -1 : (agora - t0) / 1000;
      const bruta = pose(gato ? gato.reacao : '', t);
      const ps = im.gato ? bruta : poseDaFoto(bruta);
      if (gato && t >= 0) {
        nascer(tAnt, t, ps, r, agora);
        tAnt = t;
      }
      const L = medida(r);
      const base = op.alfa ?? 1;
      /** caminho de retangulo arredondado @param {number} x @param {number} y @param {number} w @param {number} h */
      const ret = (x, y, w, h) => {
        ctx.beginPath();
        if (op.raio && ctx.roundRect) ctx.roundRect(x, y, w, h, op.raio);
        else ctx.rect(x, y, w, h);
      };
      /** @param {CanvasImageSource} img @param {number} sx @param {number} alfa @param {boolean} recorta */
      const camada = (img, sx, alfa, recorta) => {
        ctx.save();
        ctx.globalAlpha = base * alfa;
        ctx.translate(r.x + ps.px * r.w + ps.dx * L, r.y + ps.py * r.h + ps.dy * L);
        ctx.rotate(ps.rot);
        ctx.scale(sx, ps.sy);
        if (recorta) {
          ret(-ps.px * r.w, -ps.py * r.h, r.w, r.h);
          ctx.clip();
        }
        ctx.drawImage(img, -ps.px * r.w, -ps.py * r.h, r.w, r.h);
        ctx.restore();
      };
      if (im.gato) {
        ctx.save();
        ret(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.globalAlpha = base;
        ctx.drawImage(im.fundo, r.x, r.y, r.w, r.h);
        const gatoImg = /** @type {CanvasImageSource} */ (im.gato);
        ps.rastro.forEach((sx, i) => camada(gatoImg, sx, 0.22 - i * 0.08, false));
        camada(gatoImg, ps.sx, 1, false);
        ctx.restore();
      } else {
        // a foto inteira e a figurinha: pode sair do quadro
        ps.rastro.forEach((sx, i) => camada(im.fundo, sx, 0.22 - i * 0.08, true));
        camada(im.fundo, ps.sx, 1, true);
      }
      parts = parts.filter((p) => agora - p.t0 < p.vida);
      for (const p of parts) desenharParticula(ctx, p, agora);
    },
    get ocupado() {
      return parts.length > 0;
    },
  };
}
