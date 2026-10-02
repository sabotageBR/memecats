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
  g('banana', 'Banana Cat', 'Gato Banana', 'Gato Plátano', 'lendario', 'chorar', '#F2C230', 'BUAAA', [[0.19, 0.45], [0.3, 0.45]]),
  g('oiia', 'OIIA Cat', 'Gato OIIA', 'Gato OIIA', 'lendario', 'girar', '#1E9E4A', 'OIIA'),
  g('huh', 'Huh Cat', 'Gato Hã?', 'Gato ¿Eh?', 'epico', 'susto', '#B07A5A', 'HUH?'),
  g('crying', 'Crying Cat', 'Gato Chorando', 'Gato Llorando', 'raro', 'chorar', '#7C8CA8', '', [[0.39, 0.36], [0.6, 0.36]]),
  g('maxwell', 'Maxwell the Cat', 'Maxwell, o Gato', 'Maxwell el Gato', 'lendario', 'girar', '#6C7A99'),
  g('side-eye', 'Side Eye Cat', 'Gato de Lado', 'Gato de Reojo', 'raro', 'susto', '#2DBE3A', '...'),
  g('polite', 'Polite Cat', 'Gato Educado', 'Gato Educado', 'raro', 'brilhar', '#8C4A44', '', [[0.39, 0.46], [0.61, 0.48]]),
  g('floppa', 'Big Floppa', 'Big Floppa', 'Big Floppa', 'epico', 'brilhar', '#5BA5E4', 'FLOPPA', [[0.37, 0.37], [0.48, 0.36]]),
  g('cucumber', 'Cat vs Cucumber', 'Gato vs Pepino', 'Gato vs Pepino', 'raro', 'susto', '#C87A3C', '!!!'),
  g('bingus', 'Bingus', 'Bingus', 'Bingus', 'epico', 'balancar', '#C79AA6', 'BINGUS'),
  g('grumpy', 'Grumpy Cat', 'Gato Rabugento', 'Gato Gruñón', 'lendario', 'susto', '#7FA3C8', 'NO.'),
  g('nyan', 'Nyan Cat', 'Nyan Cat', 'Nyan Cat', 'lendario', 'dancar', '#1F4E8C', 'NYAN'),
  g('bongo', 'Bongo Cat', 'Gato Bongô', 'Gato Bongó', 'epico', 'dancar', '#C98B6B', 'BONGO!'),
  g('smudge', 'Smudge the Cat', 'Gato Smudge', 'Gato Smudge', 'epico', 'susto', '#C0697A', '?!'),
  g('spaghetti', 'Spaghetti Cat', 'Gato do Espaguete', 'Gato Espagueti', 'raro', 'pular', '#E07B3C', 'NOM'),
  g('screaming', 'Screaming Cat', 'Gato Gritando', 'Gato Gritando', 'raro', 'susto', '#8C6A5A', 'AAAH!'),
  g('wiwiwi', 'Wi Wi Wi Cat', 'Gato Wi Wi Wi', 'Gato Wi Wi Wi', 'raro', 'dancar', '#9B6FB5', 'WI WI WI'),
  g('staring', 'Staring Cat', 'Gato Encarando', 'Gato Mirando', 'raro', 'pop', '#8A8E96'),
  g('omg', 'OMG Cat', 'Gato OMG', 'Gato OMG', 'raro', 'susto', '#7A8496', 'OMG!'),
  g('wet', 'Wet Cat', 'Gato Molhado', 'Gato Mojado', 'comum', 'chorar', '#7A6A60', '', [[0.37, 0.35], [0.67, 0.26]]),
  g('keyboard', 'Keyboard Cat', 'Gato Tecladista', 'Gato Teclado', 'epico', 'dancar', '#3CB4C8', '♪'),
  g('longcat', 'Longcat', 'Gato Comprido', 'Gato Largo', 'epico', 'pular', '#6E88AD', 'LOOONG'),
  g('heavy-breathing', 'Heavy Breathing Cat', 'Gato Ofegante', 'Gato Jadeante', 'comum', 'pop', '#B9A598'),
  g('fits-sits', 'If I Fits I Sits', 'Se Cabe, Eu Sento', 'Si Quepo, Me Siento', 'comum', 'pular', '#B1936E'),
  g('bread', 'Bread Cat', 'Gato no Pão', 'Gato en Pan', 'comum', 'brilhar', '#D9B67A', '', [[0.4, 0.17], [0.58, 0.18]]),
  g('breading', 'Cat Breading', 'Gato Empanado', 'Gato Empanado', 'comum', 'brilhar', '#A8AA8C', '', [[0.55, 0.4], [0.73, 0.4]]),
  g('ceiling', 'Ceiling Cat', 'Gato do Teto', 'Gato del Techo', 'comum', 'brilhar', '#B8A48A', '', [[0.445, 0.45], [0.56, 0.49]]),
  g('driving', 'Driving Cat', 'Gato Motorista', 'Gato Conductor', 'comum', 'balancar', '#8A8F99', 'VRUM'),
  g('hipster', 'Hipster Cat', 'Gato Hipster', 'Gato Hipster', 'comum', 'brilhar', '#E29E65', '', [[0.41, 0.21], [0.55, 0.21]]),
  g('boat', 'Should Buy a Boat Cat', 'Gato Comprar um Barco', 'Gato Comprar un Barco', 'comum', 'brilhar', '#748EAE', '', [[0.735, 0.43]]),
  g('business', 'Business Cat', 'Gato Executivo', 'Gato Ejecutivo', 'comum', 'brilhar', '#B08A4A', '', [[0.245, 0.47], [0.29, 0.47]]),
  g('pusheen', 'Pusheen', 'Pusheen', 'Pusheen', 'comum', 'pular', '#A08A78'),
  g('maru', 'Maru', 'Maru', 'Maru', 'comum', 'pular', '#A0663C'),
  g('lil-bub', 'Lil Bub', 'Lil Bub', 'Lil Bub', 'comum', 'brilhar', '#847D62', '', [[0.22, 0.53], [0.37, 0.53]]),
  g('monorail', 'Monorail Cat', 'Gato Monotrilho', 'Gato Monorriel', 'comum', 'balancar', '#8A8F5C'),
  g('sockington', 'Sockington', 'Sockington', 'Sockington', 'comum', 'balancar', '#576482'),
  g('venus', 'Venus', 'Vênus', 'Venus', 'comum', 'brilhar', '#285496', '', [[0.48, 0.555], [0.7, 0.61]]),
  g('german', 'German Cat', 'Gato Alemão', 'Gato Alemán', 'comum', 'dancar', '#9B8776'),
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
