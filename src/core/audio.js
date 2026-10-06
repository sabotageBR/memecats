// Sons sintetizados com WebAudio: nenhum arquivo, nenhuma requisicao.
// A "voz" dos gatos e uma serra filtrada por tres formantes que deslizam de
// vogal em vogal (miau, OIIA, buaaa, hã?).
// O contexto so nasce no primeiro toque (politica de autoplay). O mudo do
// anuncio zera o ganho mestre ANTES de pedir o anuncio e suspende o contexto
// 80 ms depois (padrao do hexadrop: o onStart do SDK pode nao chegar).

const ESCALA_MAIOR = [0, 2, 4, 5, 7, 9, 11];
/** Oitava mais grave da nota sem fim: 660 / 8, entao a nota 1 tem o centro em 660 Hz. */
const BASE_SEM_FIM = 82.5;

/**
 * Nota k (1, 2, 3...) da escala sem fim (tom de Shepard): sete senos em
 * oitavas com volume em sino em torno de 660 Hz. Cada passo sobe um grau da
 * escala maior; as oitavas de baixo entram mudas e as de cima saem mudas,
 * entao k e k + 7 soam iguais e a subida nunca chega ao fim.
 * @param {number} k
 * @returns {[number, number][]} [hz, peso] da mais grave para a mais aguda
 */
export function notaSemFim(k) {
  const g = Math.max(0, Math.floor(k) - 1);
  const pos = ESCALA_MAIOR[g % 7] / 12;
  /** @type {[number, number][]} */
  const out = [];
  for (let i = 0; i < 7; i++) {
    const oit = i + pos;
    out.push([BASE_SEM_FIM * Math.pow(2, oit), Math.exp(-((oit - 3) ** 2) / 2)]);
  }
  return out;
}

export function criarAudio() {
  /** @type {AudioContext|null} */
  let ctx = null;
  /** @type {GainNode|null} */
  let mestre = null;
  /** @type {AudioBuffer|null} */
  let ruidoBuf = null;
  let mudo = false;
  let mudoAnuncio = false;
  let abaOculta = false;
  const VOLUME = 0.6;

  const ganhoAlvo = () => (mudo || mudoAnuncio || abaOculta ? 0 : VOLUME);

  function iniciar() {
    if (ctx) {
      if (ctx.state === 'suspended' && !mudoAnuncio) ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      ctx = new AC();
      mestre = ctx.createGain();
      mestre.gain.value = ganhoAlvo();
      mestre.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }

  function aplicarGanho() {
    if (!ctx || !mestre) return;
    try {
      mestre.gain.setTargetAtTime(ganhoAlvo(), ctx.currentTime, 0.02);
    } catch { /* ignora */ }
  }

  function tom(f, dur, tipo = 'sine', vol = 0.2, f2 = 0, atraso = 0) {
    if (!ctx || !mestre || mudo || mudoAnuncio) return;
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = /** @type {OscillatorType} */ (tipo);
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(mestre);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function ruido(dur, freq, q, vol, atraso = 0, tipo = 'bandpass') {
    if (!ctx || !mestre || mudo || mudoAnuncio) return;
    if (!ruidoBuf) {
      ruidoBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
      const d = ruidoBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + atraso;
    const s = ctx.createBufferSource();
    s.buffer = ruidoBuf;
    const f = ctx.createBiquadFilter();
    f.type = /** @type {BiquadFilterType} */ (tipo);
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(mestre);
    s.start(t);
    s.stop(t + dur + 0.03);
  }

  /** Formantes (Hz) das vogais, ja subidos para voz de bichinho. */
  const VOGAIS = {
    a: [1000, 1500, 3000], e: [560, 2300, 3100], i: [380, 2900, 3600], o: [620, 1050, 2900], u: [420, 900, 2700],
  };

  /**
   * Voz sintetizada: passa pelas vogais em [vogal, segundos] com o tom em [hz, segundos].
   * @param {[string, number][]} vogais
   * @param {[number, number][]} tons
   * @param {number} dur
   * @param {number} [vol]
   * @param {number} [atraso]
   */
  function voz(vogais, tons, dur, vol = 0.22, atraso = 0) {
    if (!ctx || !mestre || mudo || mudoAnuncio) return;
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(tons[0][0], t);
    for (const [f, ts] of tons) o.frequency.linearRampToValueAtTime(f, t + ts);
    // vibrato
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 6.5;
    lfoG.gain.value = tons[0][0] * 0.025;
    lfo.connect(lfoG);
    lfoG.connect(o.frequency);
    const saida = ctx.createGain();
    saida.gain.setValueAtTime(0.0001, t);
    saida.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    saida.gain.setValueAtTime(vol, t + Math.max(0.04, dur - 0.08));
    saida.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    saida.connect(mestre);
    const pesos = [1, 0.7, 0.25];
    for (let k = 0; k < 3; k++) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = k ? 9 : 6;
      const v0 = VOGAIS[/** @type {'a'} */ (vogais[0][0])];
      f.frequency.setValueAtTime(v0[k], t);
      for (const [vg, ts] of vogais) f.frequency.linearRampToValueAtTime(VOGAIS[/** @type {'a'} */ (vg)][k], t + ts);
      const g = ctx.createGain();
      g.gain.value = pesos[k] * 2.2;
      o.connect(f);
      f.connect(g);
      g.connect(saida);
    }
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  function bumbo(atraso = 0, vol = 0.35) {
    tom(140, 0.16, 'sine', vol, 45, atraso);
  }
  function chimbal(atraso = 0, vol = 0.07) {
    ruido(0.04, 8000, 1, vol, atraso, 'highpass');
  }

  /** Sons das reacoes, nos instantes de render/palco.js (BATIDAS). */
  const REACOES = {
    girar() {
      // OIIA OIIA: o-i-i-a duas vezes, bem rapido, e o vento do giro
      for (const d of [0, 0.62, 1.24]) voz([['o', 0], ['i', 0.12], ['i', 0.28], ['a', 0.42], ['a', 0.55]], [[620, 0], [760, 0.12], [700, 0.3], [820, 0.42], [640, 0.55]], 0.58, 0.2, d);
      ruido(2.2, 700, 0.6, 0.05, 0, 'lowpass');
    },
    chorar() {
      voz([['a', 0], ['a', 0.5], ['u', 0.9]], [[640, 0], [560, 0.5], [420, 0.9]], 0.95, 0.2);
      voz([['a', 0], ['a', 0.5], ['u', 0.9]], [[600, 0], [520, 0.5], [380, 0.95]], 1.0, 0.2, 1.15);
    },
    pular() {
      for (const d of [0, 0.62, 1.24]) {
        tom(220, 0.3, 'sine', 0.18, 660, d);
        tom(330, 0.25, 'triangle', 0.08, 880, d + 0.02);
      }
    },
    susto() {
      // "hã?" subindo, com o h de ar no comeco
      ruido(0.08, 1800, 1, 0.08, 0, 'bandpass');
      voz([['a', 0], ['a', 0.18], ['e', 0.42]], [[260, 0], [280, 0.15], [470, 0.45]], 0.48, 0.24, 0.04);
    },
    balancar() {
      for (let i = 0; i < 10; i++) {
        const d = i * 0.25;
        if (i % 2 === 0) bumbo(d);
        chimbal(d + 0.125);
        if (i % 4 === 2) tom([196, 220, 175, 196][(i / 2) % 4 | 0], 0.2, 'triangle', 0.1, 0, d);
      }
    },
    dancar() {
      const melodia = [523, 659, 784, 659, 587, 698, 880, 698];
      melodia.forEach((f, i) => {
        const d = i * 0.3125;
        bumbo(d, 0.25);
        tom(f, 0.18, 'square', 0.06, 0, d);
        tom(f / 2, 0.12, 'triangle', 0.08, 0, d + 0.156);
        chimbal(d + 0.156);
      });
    },
    pop() {
      for (const d of [0, 0.36, 0.72, 1.08, 1.44]) {
        tom(900, 0.08, 'sine', 0.22, 180, d);
        ruido(0.03, 2500, 3, 0.15, d);
      }
    },
    brilhar() {
      [1318, 1568, 1976, 2637].forEach((f, i) => tom(f, 0.35, 'triangle', 0.07, 0, 0.15 + i * 0.07));
      [1568, 1976, 2349, 3136].forEach((f, i) => tom(f, 0.4, 'sine', 0.05, 0, 0.95 + i * 0.07));
    },
  };

  return {
    iniciar,
    get mudo() {
      return mudo;
    },
    /** true se o som esta zerado agora (mudo, anuncio ou aba oculta) */
    get calado() {
      return ganhoAlvo() === 0;
    },
    /** @param {boolean} v */
    definirMudo(v) {
      mudo = v;
      aplicarGanho();
    },
    mudoParaAnuncio() {
      mudoAnuncio = true;
      aplicarGanho();
      setTimeout(() => {
        if (mudoAnuncio && ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
      }, 80);
    },
    /** @param {boolean} oculta */
    pausarAba(oculta) {
      abaOculta = oculta;
      aplicarGanho();
      if (!ctx) return;
      if (oculta) ctx.suspend().catch(() => {});
      else if (!mudoAnuncio) ctx.resume().catch(() => {});
    },
    voltarDoAnuncio() {
      mudoAnuncio = false;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      aplicarGanho();
    },
    pegar() {
      tom(620, 0.07, 'triangle', 0.14, 900);
    },
    /** troca de duas pecas */
    trocar() {
      ruido(0.16, 1200, 0.9, 0.07, 0, 'lowpass');
      tom(420, 0.08, 'sine', 0.06, 560);
    },
    /**
     * Acerto numero k da sequencia: a nota sobe um grau a cada acerto e nunca
     * chega ao fim (notaSemFim). Troca que trava duas pecas soa em acorde,
     * com a quinta. Do 4o acerto em diante entra um brilho que cresce ate o 10o.
     * @param {number} k
     * @param {boolean} [dupla]
     */
    travar(k = 1, dupla = false) {
      ruido(0.03, 3500, 5, 0.25);
      const nota = notaSemFim(k);
      for (const [f, p] of nota) if (p > 0.02) tom(f, 0.3, 'sine', 0.08 * p, 0, 0.01);
      if (dupla) for (const [f, p] of notaSemFim(k + 4)) if (p > 0.02) tom(f, 0.3, 'sine', 0.05 * p, 0, 0.05);
      // o brilho e a parcial da 5a oitava, entao tambem gira com a nota
      if (k >= 4) tom(nota[4][0], 0.14, 'triangle', 0.035 * Math.min(1, (k - 3) / 7), 0, 0.03);
    },
    /** Nivel sem erro. A batida cai em 0,18 s, quando o PERFECT bate na tela (render/cena.js). */
    perfeito() {
      const b = 0.18;
      tom(330, b, 'triangle', 0.07, 1320);
      ruido(b, 1600, 0.8, 0.05, 0, 'bandpass');
      bumbo(b, 0.3);
      ruido(0.7, 6500, 0.7, 0.07, b, 'highpass');
      [523, 659, 784, 1046].forEach((f) => tom(f, 0.6, 'triangle', 0.07, 0, b));
      [1568, 2093, 2637, 3136].forEach((f, i) => tom(f, 0.35, 'sine', 0.045, 0, b + 0.06 + i * 0.05));
    },
    /** toque numa peca presa */
    toc() {
      tom(300, 0.06, 'square', 0.04, 220);
    },
    erro() {
      tom(240, 0.09, 'square', 0.05, 180);
      tom(180, 0.12, 'square', 0.05, 130, 0.08);
    },
    espiar() {
      [880, 1108, 1318].forEach((f, i) => tom(f, 0.25, 'sine', 0.06, 0, i * 0.05));
    },
    embaralhar() {
      ruido(0.35, 900, 0.7, 0.09, 0, 'lowpass');
      for (let i = 0; i < 6; i++) ruido(0.03, 2000 + i * 300, 4, 0.08, 0.05 + i * 0.045);
    },
    miau() {
      voz([['i', 0], ['a', 0.18], ['u', 0.42]], [[560, 0], [720, 0.16], [480, 0.45]], 0.48, 0.2);
    },
    /** @param {string} reacao */
    reagir(reacao) {
      const f = /** @type {Record<string, () => void>} */ (REACOES)[reacao];
      if (f) f();
    },
    vitoria() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tom(f, 0.26, 'triangle', 0.11, 0, i * 0.085));
    },
    tique() {
      tom(1200, 0.04, 'triangle', 0.07);
    },
  };
}
