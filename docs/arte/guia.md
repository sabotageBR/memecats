# Guia de arte: IA + edição

Este guia é o caminho para trocar as imagens atuais por arte própria, publicável.

> **Estado em 2026-10-01:** os 38 gatos do catálogo (`src/jogo/catalogo.js`) usam as imagens originais dos memes, entregues pelo usuário e sem alteração (`"tipo": "original"` em `arte/origem.json`; ver a seção Arte do `CLAUDE.md`). Para a Poki, cada uma precisa ser trocada por arte de IA com edição, como descrito abaixo, ou ter licença. Os prompts em [`prompts.md`](prompts.md) foram escritos para o catálogo anterior, de 30 gatos. Os que coincidem (banana, oiia e huh) servem como estão. Os outros pedem um prompt novo no mesmo modelo.

## O que entregar por gato

A pasta é `arte/bruto/<id>/` (o `id` vem do catálogo: `banana`, `oiia`, `huh`...).

| Arquivo | O que é |
|---|---|
| `fundo.png` | O cenário **sem o gato**, quadrado, com 1024 px ou mais. |
| `gato.png` | O gato recortado, com **fundo transparente**, no **mesmo enquadramento** do fundo: mesma tela quadrada e o gato na posição em que fica na cena. |
| `imagem.png` *(alternativa)* | A cena inteira, sem recorte. Funciona, mas a reação passa a animar a imagem toda e fica bem mais pobre. Serve como quebra-galho. |

Em seguida:

1. registrar o gato em `arte/origem.json` (ver o modelo abaixo);
2. rodar `npm run arte`. O comando converte para WebP (1024 px, mais uma miniatura de 256 px), confere tamanho, transparência e registro, e regenera `src/arte/manifesto.js`;
3. abrir `npm run servir` com `?gato=<id>&revelar` para ver a reação com a arte nova;
4. se as lágrimas ou o brilho saírem fora dos olhos, ajustar o campo `olhos` do gato no catálogo. São coordenadas de 0 a 1 do centro de cada olho.

## Estilo: o bloco fixo de todo prompt

```
3D cartoon render of a cute chibi kitten, big head, big expressive eyes, soft studio lighting,
vibrant saturated colors, smooth clean shapes, high detail, centered, full body, square 1:1,
no text, no letters, no watermark, no logo, no signature
```

O mesmo bloco em todos os gatos deixa a coleção coesa. Gere várias e escolha.

## Regras de composição (é isso que faz o quebra-cabeça funcionar)

1. **Detalhe na tela inteira.** O fundo precisa de objetos, padrões e confete em toda a área. Céu liso, parede lisa ou degradê geram peças iguais, e o jogador não consegue distinguir umas das outras. Na grade 6x6, cada pedaço de 1/36 da imagem tem que ser reconhecível.
2. **Gato no centro, de corpo inteiro**, ocupando de 55% a 65% da altura, com os pés perto de 88% da altura (o "chão" do palco) e os olhos perto de 45% a 50%.
3. **Contraste** entre o gato e o fundo, para o recorte e a leitura.
4. **A cor dominante do fundo** igual ao campo `cor` do gato no catálogo, para o HUD combinar.
5. **Nada de cópia do meme original.** O conceito e a pose ("gato de fantasia de banana chorando") podem; a mesma foto, a mesma composição ou o rosto do gato real, não. No prompt, nada de nome de pessoa, de gato real, de artista ou de marca.
6. **Nada assustador** (regra da Poki): o "Gato do Grito" fica numa montanha-russa, não numa casa assombrada.

## Como chegar às duas camadas

**Opção A (recomendada): gato e cenário separados.**

1. Gere o gato sozinho, com o bloco de estilo + a descrição do gato + `isolated on a plain flat light green background`.
2. Recorte o gato (remove.bg, rembg, o "remover fundo" do Photoshop, Photopea ou Canva) e limpe o halo verde da borda.
3. Gere o cenário sozinho, com o bloco de estilo + a descrição do cenário + `empty scene with no characters, open floor space in the center`.
4. Num editor, numa tela quadrada de 1024 px ou mais, ponha o gato no lugar (centro, pés perto de 88% da altura) e exporte:
   - a camada do gato sozinha, transparente: `gato.png`;
   - o cenário sozinho: `fundo.png`.
5. Uma sombra suave sob os pés, pintada no **fundo**, ajuda o gato a "pousar" na cena.

**Opção B: a cena inteira, depois separar.**

1. Gere a cena completa.
2. Recorte o gato: `gato.png`, na tela inteira e com transparência fora dele.
3. Apague o gato do fundo com preenchimento generativo ou inpainting (Photoshop Generative Fill, Photopea, ou a edição de imagem da própria IA): `fundo.png`.
4. **Confira o fundo limpo**: quando o gato pula ou gira, qualquer resto dele aparece.

## Ferramenta e licença

- Use uma ferramenta **cujo plano permita uso comercial** e confira os termos vigentes no dia. Os termos mudam, e a Poki pode perguntar.
- **Exemplos que costumam permitir:**
  - geração de imagem da OpenAI (GPT-image);
  - Google Gemini/Imagen;
  - Midjourney em plano pago;
  - Adobe Firefly.
- **Exemplos que não permitem:** pesos com licença não comercial, como o FLUX.1 [dev] rodado localmente.
- **Registre o plano usado** em `arte/origem.json`. A Poki aceita conteúdo feito com IA desde que você mostre como e com quais ferramentas, que ele tenha sido testado e editado (saída crua não serve), e que não haja marca d'água nem texto do prompt na imagem.

## Checagem de nome (marca)

Antes de publicar, procure cada nome em inglês do catálogo:

- **Onde procurar:**
  - USPTO: tmsearch.uspto.gov;
  - EUIPO: eSearch plus;
  - WIPO: Global Brand Database.
- **Se houver registro** nas classes 9, 28 ou 41 (jogos, brinquedos, entretenimento), troque por um nome descritivo.
- **Já ficaram de fora:**
  - Grumpy Cat, Nyan Cat, Keyboard Cat e Longcat, que têm dono ou já são jogo na Poki;
  - qualquer coisa Skibidi.
- **Nomes de gatos reais** (Maxwell, Floppa, Smudge) foram trocados por descrições: Big Ears Caracal, Salad Cat...

## Checklist por imagem

- [ ] Quadrada, com 1024 px ou mais.
- [ ] Sem texto, marca d'água ou assinatura.
- [ ] Quatro patas, dois olhos simétricos, um rabo.
- [ ] Recorte sem halo; `gato.png` com transparência.
- [ ] `fundo.png` sem resto do gato.
- [ ] Detalhe em toda a área (teste: cada um dos 36 quadradinhos é reconhecível?).
- [ ] Registro em `arte/origem.json` e `npm run arte` sem falha.
- [ ] `olhos` ajustado no catálogo, se preciso.

## Modelo do `arte/origem.json`

```json
{
  "banana": {
    "ferramenta": "GPT-image (ChatGPT)",
    "plano": "ChatGPT Plus; termos de 2026-10 permitem uso comercial",
    "prompt": "3D cartoon render of a cute chibi kitten, ... wearing a yellow banana costume hood ...",
    "data": "2026-10-02",
    "edicoes": "gato recortado no remove.bg; fundo limpo com preenchimento generativo no Photopea; corrigida a pata esquerda"
  }
}
```
