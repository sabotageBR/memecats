// Arte: o manifesto gerado por tools/arte.mjs bate com os arquivos, com o
// catalogo e com o registro de origem (a Poki pede o "como" da IA; a imagem
// original de meme registra de onde veio e prova que nao foi alterada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COM_ARTE } from '../src/arte/manifesto.js';
import { gatoPorId } from '../src/jogo/catalogo.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const origem = () => JSON.parse(readFileSync(join(raiz, 'arte/origem.json'), 'utf8'));

test('todo gato do manifesto existe no catalogo e tem os arquivos', () => {
  for (const [id, info] of Object.entries(COM_ARTE)) {
    assert.ok(gatoPorId(id), id);
    for (const nome of [info.arq, 'mini.webp', ...(info.gato ? ['gato.webp'] : [])]) {
      assert.ok(existsSync(join(raiz, 'src/arte', id, nome)), `${id}/${nome}`);
    }
  }
});

test('todo gato com arte tem registro completo em arte/origem.json', () => {
  const ids = Object.keys(COM_ARTE);
  if (!ids.length) return;
  const reg = origem();
  for (const id of ids) {
    const r = reg[id] || {};
    const campos = r.tipo === 'original' ? ['arquivo', 'fonte', 'data', 'edicoes'] : ['ferramenta', 'plano', 'prompt', 'data', 'edicoes'];
    for (const campo of campos) assert.ok(String(r[campo] || '').trim(), `${id}: ${campo}`);
  }
});

test('imagem original de meme vai para o jogo sem alteracao (sha256 do registro)', () => {
  const reg = origem();
  for (const [id, info] of Object.entries(COM_ARTE)) {
    const r = reg[id];
    if (!r || r.tipo !== 'original' || !r.sha256) continue;
    assert.equal(info.gato, false, id);
    const sha = createHash('sha256').update(readFileSync(join(raiz, 'src/arte', id, info.arq))).digest('hex');
    assert.equal(sha, r.sha256, id);
  }
});
