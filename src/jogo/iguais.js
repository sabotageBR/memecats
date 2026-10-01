// Pecas iguais. Modulo puro.
//
// Foto de meme tem areas lisas (parede branca, fundo verde, tarja preta) que
// viram pecas identicas: o jogador nao tem como saber qual vai em qual
// celula. Pecas que parecem iguais formam uma classe, e qualquer peca da
// classe fica certa em qualquer celula da classe (ver tabuleiro.js).
//
// A comparacao usa a imagem reduzida: cada peca vira sub x sub medias de cor.
// Duas pecas sao iguais quando:
// - quase identicas: a diferenca media e a maior diferenca entre essas medias
//   ficam abaixo de "media" e "maximo"; ou
// - as duas lisas (nenhuma media foge mais que "lisa" da cor da peca) e de
//   tom parecido (cor media a menos de "tom" em cada canal). Parede com uma
//   sombra leve fica uma classe so: isolada, a peca nao da pista do lugar.
// A classe compara com o primeiro membro (nao encadeia), entao um degrade
// forte nao vira uma classe so.

/**
 * @param {ArrayLike<number>} dados RGBA da imagem reduzida a (cols*k) x (lins*k)
 * @param {number} cols
 * @param {number} lins
 * @param {number} k pixels por peca em cada lado
 * @param {{ sub?: number, media?: number, maximo?: number, lisa?: number, tom?: number }} [op]
 *   sub: medias por lado da peca; os outros sao limiares (0..255)
 * @returns {number[]} classe[peca] = menor peca da classe
 */
export function classesIguais(dados, cols, lins, k, op = {}) {
  const sub = Math.max(1, Math.min(k, op.sub || 6));
  const media = op.media ?? 5;
  const maximo = op.maximo ?? 16;
  const lisa = op.lisa ?? 14;
  const tom = op.tom ?? 24;
  const n = cols * lins;
  const larg = cols * k;
  const tam = sub * sub * 3;
  /** @type {Float64Array[]} */
  const assin = [];
  /** cor media de cada peca e se ela e lisa */
  /** @type {{ cor: number[], lisa: boolean }[]} */
  const resumo = [];
  for (let p = 0; p < n; p++) {
    const x0 = (p % cols) * k;
    const y0 = Math.floor(p / cols) * k;
    const soma = new Float64Array(tam);
    const conta = new Float64Array(sub * sub);
    for (let y = 0; y < k; y++) {
      const sy = Math.floor((y * sub) / k);
      for (let x = 0; x < k; x++) {
        const s = sy * sub + Math.floor((x * sub) / k);
        const i = ((y0 + y) * larg + x0 + x) * 4;
        soma[s * 3] += dados[i];
        soma[s * 3 + 1] += dados[i + 1];
        soma[s * 3 + 2] += dados[i + 2];
        conta[s]++;
      }
    }
    const cor = [0, 0, 0];
    for (let s = 0; s < sub * sub; s++) {
      for (let ch = 0; ch < 3; ch++) {
        soma[s * 3 + ch] /= conta[s] || 1;
        cor[ch] += soma[s * 3 + ch] / (sub * sub);
      }
    }
    let desvio = 0;
    for (let i = 0; i < tam; i++) desvio = Math.max(desvio, Math.abs(soma[i] - cor[i % 3]));
    assin.push(soma);
    resumo.push({ cor, lisa: desvio < lisa });
  }
  /** @param {number} p @param {number} q */
  const iguais = (p, q) => {
    const rp = resumo[p];
    const rq = resumo[q];
    if (rp.lisa && rq.lisa && rp.cor.every((v, ch) => Math.abs(v - rq.cor[ch]) < tom)) return true;
    const a = assin[p];
    const b = assin[q];
    let total = 0;
    for (let i = 0; i < tam; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d >= maximo) return false;
      total += d;
    }
    return total / tam < media;
  };
  /** @type {number[]} */
  const classe = [];
  /** @type {number[]} primeiro membro de cada classe */
  const reps = [];
  for (let p = 0; p < n; p++) {
    const r = reps.find((q) => iguais(p, q));
    if (r === undefined) {
      reps.push(p);
      classe.push(p);
    } else {
      classe.push(r);
    }
  }
  return classe;
}
