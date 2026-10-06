// Texto de src/arte/manifesto.js, o mesmo para tools/arte.mjs e para a
// curadoria (tools/curadoria.mjs): quem gera e um deles, ninguem edita a mao.

/**
 * @param {Record<string, { arq: string, gato: boolean }>} manifesto na ordem do catalogo
 * @returns {string}
 */
export function textoManifesto(manifesto) {
  const linhas = Object.entries(manifesto).map(([id, v]) => `  ${/^[a-z]+$/.test(id) ? id : `'${id}'`}: { arq: '${v.arq}', gato: ${v.gato} },`);
  return `// GERADO por tools/arte.mjs: nao edite a mao.
// Gatos com arte em src/arte/<id>/. Os outros usam o gato provisorio.
// arq: imagem base (fundo.webp da arte de IA, ou a imagem original do meme
// copiada sem alteracao). gato: true = tem a camada do gato recortada.

/** @type {Readonly<Record<string, { arq: string, gato: boolean }>>} */
export const COM_ARTE = Object.freeze({${linhas.length ? '\n' + linhas.join('\n') + '\n' : ''}});
`;
}
