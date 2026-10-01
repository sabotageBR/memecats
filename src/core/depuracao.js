// Parametros de teste na URL. So valem em file://, localhost e 127.0.0.1:
// na Poki nada disso existe. Unico modulo que le a URL.
//   ?nivel=12   comeca no nivel 12
//   ?gato=oiia  troca o gato do nivel (ids em src/jogo/catalogo.js)
//   ?auto=400   joga sozinho (uma troca a cada 400 ms) e passa de nivel
//   ?fixo       sem a animacao de entrada (mostra e ja embaralha)
//   ?semanuncio nao pede intervalo comercial (prints e testes longos)
//   ?album      abre o album ao carregar (prints)
//   ?revelar    resolve o nivel na hora e mostra a revelacao (prints)
//   ?todos      album com todos os gatos liberados (prints)

// Fora disso, so o banco de testes de tools/sdkcheck.html liga os ganchos
// (window.__memecatsTeste = { nivel, ... }); nesse caso "local" continua
// falso, para o jogo se comportar como na Poki (sem premio sem SDK).

const NADA = { local: false, ganchos: false, nivel: 0, gato: '', auto: 0, fixo: false, semAnuncio: false, album: false, revelar: false, todos: false };

export function lerDepuracao() {
  let local = false;
  try {
    local = location.protocol === 'file:' || /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  } catch {
    local = false;
  }
  const teste = /** @type {any} */ (globalThis).__memecatsTeste;
  if (!local && teste && typeof teste === 'object') {
    return { ...NADA, ganchos: true, nivel: Math.max(0, teste.nivel | 0), fixo: !!teste.fixo };
  }
  if (!local) return { ...NADA };
  const q = new URLSearchParams(location.search);
  return {
    local: true,
    ganchos: true,
    nivel: q.has('nivel') ? Math.max(1, parseInt(q.get('nivel') || '1', 10) || 1) : 0,
    gato: q.get('gato') || '',
    auto: q.has('auto') ? Math.max(120, parseInt(q.get('auto') || '400', 10) || 400) : 0,
    fixo: q.has('fixo'),
    semAnuncio: q.has('semanuncio'),
    album: q.has('album'),
    revelar: q.has('revelar'),
    todos: q.has('todos'),
  };
}
