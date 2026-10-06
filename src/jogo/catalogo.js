// Catalogo dos gatos de meme. Modulo puro.
//
// As imagens sao as dos memes, entregues pelo usuario e usadas sem alteracao
// (arte/origem.json registra o arquivo de cada uma). Nao sao desenhos
// originais: antes de publicar, ver a secao Arte do CLAUDE.md.
//
// - reacao: animacao da revelacao (ver render/palco.js);
// - cor: tom do fundo da pagina e da moldura enquanto o gato esta em jogo;
// - olhos: centro dos olhos na imagem 0..1 (lagrimas e brilho saem dali).
//   So as reacoes chorar e brilhar usam; os outros ficam com o padrao;
// - fala: onomatopeia do meme, igual em todos os idiomas.

/** @typedef {'comum'|'raro'|'epico'|'lendario'} Raridade */
/** @typedef {'girar'|'chorar'|'pular'|'susto'|'balancar'|'dancar'|'pop'|'brilhar'} Reacao */

/**
 * @typedef {Object} Gato
 * @property {string} id
 * @property {{ en: string, pt: string, es: string }} nome
 * @property {Raridade} raridade
 * @property {Reacao} reacao
 * @property {string} cor
 * @property {[number, number][]} olhos
 * @property {string} fala onomatopeia que salta na revelacao ('' = nenhuma)
 */

export const REACOES = Object.freeze(['girar', 'chorar', 'pular', 'susto', 'balancar', 'dancar', 'pop', 'brilhar']);
export const RARIDADES = Object.freeze(['comum', 'raro', 'epico', 'lendario']);

const OLHOS = /** @type {[number, number][]} */ ([[0.42, 0.4], [0.58, 0.4]]);

/**
 * @param {string} id @param {string} en @param {string} pt @param {string} es @param {Raridade} raridade
 * @param {Reacao} reacao @param {string} cor @param {string} [fala] @param {[number, number][]} [olhos]
 */
const g = (id, en, pt, es, raridade, reacao, cor, fala = '', olhos = OLHOS) => ({ id, nome: { en, pt, es }, raridade, reacao, cor, olhos, fala });

/** @type {readonly Gato[]} na ordem dos niveis: os mais famosos primeiro */
export const CATALOGO = Object.freeze([
  g('crying', 'Crying Cat', 'Gato Chorando', 'Gato Llorando', 'raro', 'chorar', '#7C8CA8', '', [[0.39, 0.36], [0.6, 0.36]]),
  g('polite', 'Polite Cat', 'Gato Educado', 'Gato Educado', 'raro', 'brilhar', '#8C4A44', '', [[0.39, 0.46], [0.61, 0.48]]),
  g('wig', 'Wig Cat', 'Gato de Peruca', 'Gato con Peluca', 'comum', 'girar', '#A7907A'),
  g('smudge', 'Smudge the Cat', 'Gato Smudge', 'Gato Smudge', 'epico', 'susto', '#C0697A', '?!'),
  g('salad', 'Salad Cat', 'Gato da Salada', 'Gato de la Ensalada', 'comum', 'pop', '#110E10'),
  g('driving', 'Driving Cat', 'Gato Motorista', 'Gato Conductor', 'comum', 'balancar', '#8A8F99', 'VRUM'),
  g('ok', 'OK Cat', 'Gato OK', 'Gato OK', 'comum', 'dancar', '#C7AF93', 'OK!'),
  g('maxwell', 'Maxwell the Cat', 'Maxwell, o Gato', 'Maxwell el Gato', 'lendario', 'girar', '#6C7A99'),
  g('floppa', 'Big Floppa', 'Big Floppa', 'Big Floppa', 'epico', 'brilhar', '#5BA5E4', 'FLOPPA', [[0.37, 0.37], [0.48, 0.36]]),
  g('cucumber', 'Cat vs Cucumber', 'Gato vs Pepino', 'Gato vs Pepino', 'raro', 'susto', '#C87A3C', '!!!'),
  g('bongo', 'Bongo Cat', 'Gato Bongô', 'Gato Bongó', 'epico', 'dancar', '#C98B6B', 'BONGO!'),
  g('spaghetti', 'Spaghetti Cat', 'Gato do Espaguete', 'Gato Espagueti', 'raro', 'pular', '#E07B3C', 'NOM'),
  g('screaming', 'Screaming Cat', 'Gato Gritando', 'Gato Gritando', 'raro', 'susto', '#8C6A5A', 'AAAH!'),
  g('staring', 'Staring Cat', 'Gato Encarando', 'Gato Mirando', 'raro', 'pop', '#8A8E96'),
  g('wet', 'Wet Cat', 'Gato Molhado', 'Gato Mojado', 'comum', 'chorar', '#7A6A60', '', [[0.37, 0.35], [0.67, 0.26]]),
  g('tuxedo', 'Tuxedo Cat', 'Gato de Smoking', 'Gato de Esmoquin', 'comum', 'pop', '#D9D1CB'),
  g('longcat', 'Longcat', 'Gato Comprido', 'Gato Largo', 'epico', 'pular', '#6E88AD', 'LOOONG'),
  g('bread', 'Bread Cat', 'Gato no Pão', 'Gato en Pan', 'comum', 'brilhar', '#D9B67A', '', [[0.4, 0.17], [0.58, 0.18]]),
  g('breading', 'Cat Breading', 'Gato Empanado', 'Gato Empanado', 'comum', 'brilhar', '#A8AA8C', '', [[0.55, 0.4], [0.73, 0.4]]),
  g('ceiling', 'Ceiling Cat', 'Gato do Teto', 'Gato del Techo', 'comum', 'brilhar', '#B8A48A', '', [[0.408, 0.486], [0.625, 0.575]]),
  g('hipster', 'Hipster Cat', 'Gato Hipster', 'Gato Hipster', 'comum', 'brilhar', '#E29E65', '', [[0.41, 0.21], [0.55, 0.21]]),
  g('boat', 'Should Buy a Boat Cat', 'Gato Comprar um Barco', 'Gato Comprar un Barco', 'comum', 'brilhar', '#748EAE', '', [[0.735, 0.43]]),
  g('business', 'Business Cat', 'Gato Executivo', 'Gato Ejecutivo', 'comum', 'brilhar', '#B08A4A', '', [[0.245, 0.47], [0.29, 0.47]]),
  g('maru', 'Maru', 'Maru', 'Maru', 'comum', 'pular', '#A0663C'),
  g('monorail', 'Monorail Cat', 'Gato Monotrilho', 'Gato Monorriel', 'comum', 'balancar', '#8A8F5C'),
  g('sockington', 'Sockington', 'Sockington', 'Sockington', 'comum', 'balancar', '#576482'),
  g('venus', 'Venus', 'Vênus', 'Venus', 'comum', 'brilhar', '#285496', '', [[0.48, 0.555], [0.7, 0.61]]),
  g('surprised', 'Surprised Cat', 'Gato Surpreso', 'Gato Sorprendido', 'comum', 'girar', '#524A50'),
  g('serious', 'Serious Cat', 'Gato Sério', 'Gato Serio', 'comum', 'chorar', '#898578', '', [[0.42, 0.25], [0.64, 0.25]]),
]);

/**
 * Gato do nivel: um por nivel; depois do ultimo, volta ao comeco como
 * variante (variante 1, 2, ...), com grade maior.
 * @param {number} nivel
 * @returns {{ gato: Gato, indice: number, variante: number }}
 */
export function gatoDoNivel(nivel) {
  const i = Math.max(0, Math.floor(nivel) - 1);
  const indice = i % CATALOGO.length;
  return { gato: CATALOGO[indice], indice, variante: Math.floor(i / CATALOGO.length) };
}

/** @param {string} id */
export const gatoPorId = (id) => CATALOGO.find((x) => x.id === id) || null;
