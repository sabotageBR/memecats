// Servidor estatico minimo (sem dependencias) para as ferramentas de teste.
// Uso direto: node tools/servir.mjs [porta]  (padrao 5340, so 127.0.0.1)
// Unica escrita: POST /__curadoria, da pagina tools/curadoria.html.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
};

/** Teto do POST da curadoria (as imagens novas vao inteiras, em base64). */
const LIMITE_CURADORIA = 300 * 1024 * 1024;

/** @param {number} porta @returns {Promise<() => Promise<void>>} fecha o servidor */
export function servir(porta) {
  const srv = createServer(async (req, res) => {
    // curadoria das imagens (tools/curadoria.html): grava no projeto
    if (req.method === 'POST' && req.url === '/__curadoria') {
      try {
        const partes = [];
        let tam = 0;
        for await (const d of req) {
          tam += d.length;
          if (tam > LIMITE_CURADORIA) throw new Error('pedido grande demais');
          partes.push(d);
        }
        // sem cache: a ferramenta pode mudar com o servidor no ar
        const { salvarCuradoria } = await import(`./curadoria.mjs?v=${Date.now()}`);
        const r = await salvarCuradoria(JSON.parse(Buffer.concat(partes).toString('utf8')));
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, feitos: [], erros: [String(/** @type {Error} */ (e).message || e)] }));
      }
      return;
    }
    try {
      const caminho = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
      let arq = normalize(join(RAIZ, caminho));
      if (!arq.startsWith(resolve(RAIZ))) throw new Error('fora');
      if ((await stat(arq)).isDirectory()) arq = join(arq, 'index.html');
      const corpo = await readFile(arq);
      res.writeHead(200, { 'content-type': TIPOS[extname(arq)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(corpo);
    } catch {
      res.writeHead(404);
      res.end('404');
    }
  });
  return new Promise((ok, falha) => {
    srv.once('error', falha);
    srv.listen(porta, '127.0.0.1', () => ok(() => new Promise((r) => srv.close(() => r()))));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const porta = Number(process.argv[2]) || 5340;
  await servir(porta);
  process.stdout.write(`Meme Cats Puzzle em http://127.0.0.1:${porta}/\n`);
  process.stdout.write(`Curadoria das imagens em http://127.0.0.1:${porta}/tools/curadoria.html\n`);
}
