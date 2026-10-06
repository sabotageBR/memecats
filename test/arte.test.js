// Arte: o manifesto gerado por tools/arte.mjs bate com os arquivos, com o
// catalogo e com o registro de origem (a Poki pede o "como" da IA; a imagem
// original de meme registra de onde veio e prova que nao foi alterada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

/** Largura e altura de um JPEG (marcador SOF). @param {Buffer} b */
function medirJpeg(b) {
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
/** Largura e altura de JPEG, PNG ou WebP. @param {Buffer} b */
function medirImagem(b) {
  if (b[0] === 0xff && b[1] === 0xd8) return medirJpeg(b);
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const tipo = b.toString('latin1', 12, 16);
    if (tipo === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (tipo === 'VP8L') return { w: 1 + (((b[22] & 0x3f) << 8) | b[21]), h: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
    if (tipo === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  }
  return null;
}
const sha = (/** @type {string} */ arq) => createHash('sha256').update(readFileSync(arq)).digest('hex');
/** o original em arte/bruto/<id>/ (imagem.jpg, .png ou .webp) @param {string} id */
const bruto = (id) => {
  const dir = join(raiz, 'arte/bruto', id);
  const f = existsSync(dir) ? readdirSync(dir).find((n) => /^imagem\.(jpe?g|png|webp)$/.test(n)) : undefined;
  return f ? join(dir, f) : join(dir, 'imagem.jpg');
};

test('imagem original de meme vai para o jogo sem alteracao (sha256 do registro)', () => {
  const reg = origem();
  for (const [id, info] of Object.entries(COM_ARTE)) {
    const r = reg[id];
    if (!r || r.tipo !== 'original' || !r.sha256 || r.corte) continue;
    assert.equal(info.gato, false, id);
    assert.equal(sha(join(raiz, 'src/arte', id, info.arq)), r.sha256, id);
  }
});

test('imagem cortada na curadoria: original intacto em arte/bruto e o jogo com o tamanho do corte', () => {
  const reg = origem();
  for (const [id, info] of Object.entries(COM_ARTE)) {
    const r = reg[id];
    if (!r || !r.corte) continue;
    const { x, y, w, h } = r.corte;
    assert.ok([x, y, w, h].every(Number.isInteger) && x >= 0 && y >= 0 && w >= 16 && h >= 16, `${id}: corte`);
    assert.equal(info.arq, 'imagem.jpg', id);
    const arq = bruto(id);
    if (r.sha256) assert.equal(sha(arq), r.sha256, `${id}: o original mudou`);
    const original = medirImagem(readFileSync(arq));
    assert.ok(original && x + w <= original.w && y + h <= original.h, `${id}: corte fora do original`);
    assert.deepEqual(medirJpeg(readFileSync(join(raiz, 'src/arte', id, 'imagem.jpg'))), { w, h }, `${id}: imagem do jogo`);
  }
});

test('o medidor de imagem do teste le todos os originais', () => {
  for (const id of Object.keys(COM_ARTE)) {
    const m = medirImagem(readFileSync(bruto(id)));
    assert.ok(m && m.w > 16 && m.h > 16, id);
  }
});
