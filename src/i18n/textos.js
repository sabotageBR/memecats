// Textos do jogo. Quase tudo e icone; o que sobra cabe aqui.
// Ingles e o padrao (Poki e global); PT e ES pelo idioma do navegador.
// Os nomes dos gatos ficam no catalogo (src/jogo/catalogo.js).

const TEXTOS = {
  en: {
    nivel: 'Level', som: 'Sound', album: 'Cat album', espiar: 'Peek', dica: 'Hint', proximo: 'Next', fechar: 'Close',
    gatos: 'Cats', novo: 'New!', repetir: 'Tap the cat!',
    comum: 'Common', raro: 'Rare', epico: 'Epic', lendario: 'Legendary',
  },
  pt: {
    nivel: 'Nível', som: 'Som', album: 'Álbum de gatos', espiar: 'Espiar', dica: 'Dica', proximo: 'Próximo', fechar: 'Fechar',
    gatos: 'Gatos', novo: 'Novo!', repetir: 'Toque no gato!',
    comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
  },
  es: {
    nivel: 'Nivel', som: 'Sonido', album: 'Álbum de gatos', espiar: 'Mirar', dica: 'Pista', proximo: 'Siguiente', fechar: 'Cerrar',
    gatos: 'Gatos', novo: '¡Nuevo!', repetir: '¡Toca al gato!',
    comum: 'Común', raro: 'Raro', epico: 'Épico', lendario: 'Legendario',
  },
};

/** @param {readonly string[]} [langs] */
export function escolherIdioma(langs = (typeof navigator !== 'undefined' && navigator.languages) || []) {
  for (const l of langs) {
    const p = String(l).slice(0, 2).toLowerCase();
    if (p in TEXTOS) return p;
  }
  return 'en';
}

/** @param {string} idioma */
export function textos(idioma) {
  return { ...TEXTOS.en, ...(TEXTOS[/** @type {'en'} */ (idioma)] || {}) };
}
