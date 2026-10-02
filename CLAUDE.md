# Meme Cats Puzzle

Quebra-cabeça de troca com gatos de meme, para a Poki. É inspirado no Brainrot Puzzle (Playrea), que fez 1 milhão de partidas num dia em maio de 2025. Feito **só com HTML + JavaScript**: ES modules nativos, canvas 2D e WebAudio, no mesmo padrão do `../colortrain`. Nada de bundler, framework ou TypeScript. O jogo publicado não tem dependência nenhuma, e as ferramentas usam o Node 18+, o Chrome e o ImageMagick (`magick`).

O plano aprovado fica em `~/.claude/plans/leia-esse-artigo-e-hidden-swing.md`.

## Regra do jogo
- **Imagem e grade.** A imagem de um gato vira uma grade de peças. Ela aparece inteira por um instante e embaralha num desarranjo: nenhuma peça começa no lugar.
- **Troca.** Arrastar uma peça até outra, ou tocar numa e depois na outra, troca as duas.
- **Trava e cola.** Peça no lugar certo trava (clique, brilho, não mexe mais). Peças certas vizinhas perdem a borda entre si, e a imagem vai colando.
- **Revelação.** Montada a imagem, o gato ganha vida com a reação do meme (animação, fala e som) e entra no álbum. O botão ▶ leva ao próximo gato. Tocar no gato repete a reação.
- **Sem derrota e sem cronômetro.**
  - **Espiar:** uma vez por nível, mostra a imagem inteira por 2 s.
  - **Dica:** vídeo recompensado que coloca uma peça certa.
- **Curva** (`src/jogo/curva.js`): 2x2 (tutorial com a mão), 3x3, 3x4, 4x4, 4x5, 5x5, 5x6 e 6x6. Do nível 39 em diante, os gatos voltam como variantes, com a grade girando entre 5x5, 5x6 e 6x6.
- **Imagem retangular:** o quadro tem a proporção da imagem, sem corte. `gradeParaImagem` troca a grade da curva por uma com quase o mesmo número de peças e peças perto de quadradas (até 8x8). Uma foto 16:9 no nível 10, por exemplo, vira 5x3.
- **Peças iguais** (`src/jogo/iguais.js`): áreas lisas da foto (parede branca, fundo verde, tarja preta) viram peças que ninguém distingue. Peças que parecem iguais formam uma classe e travam em qualquer célula da classe; parte delas já começa travada.

## Estrutura
- **`src/jogo/`: lógica pura** (sem DOM, sem relógio e sem sorteio fora de `core/rng.js`):
  - `tabuleiro.js`: `pos[celula] = peca`, `classe` opcional, trocar, travar, `dica`, `colada`;
  - `curva.js`: `grade` e `gradeParaImagem`;
  - `iguais.js`: classes de peças iguais a partir da imagem reduzida;
  - `catalogo.js`: os 38 gatos, com nomes EN/PT/ES, raridade, `reacao`, `cor`, `olhos` e `fala`.
- **`src/render/`:**
  - `layout.js`: geometria pura;
  - `cena.js`: moldura, peças com tween e cola, seleção, arrasto, mão, espiada e revelação;
  - `palco.js`: as 8 reações. Cada pose é função pura do tempo, e as `BATIDAS` são os mesmos instantes que o som usa. Na foto sem recorte, a imagem inteira é a figurinha que faz a reação (pode sair do quadro);
  - `imagens.js`: arte pelo manifesto ou gato provisório, cache de até 3 gatos, miniaturas e a amostra para as peças iguais;
  - `provisorio.js`: o gato desenhado em canvas, só para quando a imagem falha ao carregar.
- **`src/arte/`: arte processada**, que é **gerada** por `npm run arte`. O `manifesto.js` também é gerado; não edite à mão.
- **`src/core/`:**
  - `poki.js`, cópia do colortrain, com fila e prazos;
  - `audio.js`: síntese, incluindo a voz de gato por formantes e os sons das reações;
  - `armazenamento.js`, `depuracao.js` e `rng.js`.
- **`src/ui/`:**
  - `album.js`: figurinhas por raridade e um palco que repete a reação a cada toque;
  - `estilo.css`;
  - as fontes Fredoka (OFL, em `LICENCAS.txt`).
- **`src/main.js`** liga tudo.
- **Arte:**
  - `arte/bruto/<id>/` recebe a entrada de cada gato;
  - `arte/origem.json` registra a origem de cada gato;
  - `docs/arte/guia.md` e `docs/arte/prompts.md` têm as regras e os prompts para arte de IA.

## Convenções
- Código e comentários em português, comentários em ASCII. 2 espaços, aspas simples, ponto e vírgula, `catch { /* ignora */ }`. JSDoc no lugar de tipos.
- Fronteiras vigiadas por `test/estilo.test.js`:
  - só `main.js` importa `poki.js`;
  - só `armazenamento.js` toca o `localStorage`;
  - só `depuracao.js` lê a URL;
  - `src/jogo/` não usa sorteio, DOM nem relógio (o teste procura o texto, inclusive em comentário);
  - sem `console.log`;
  - a única URL externa é o SDK da Poki.
- **Um relógio só:** `performance.now()`, passado como `agora` para a cena e o palco. O carimbo do `requestAnimationFrame` não é usado.
- O texto é quase todo em ícone. EN é o padrão, com PT e ES em `src/i18n/textos.js`. Os nomes dos gatos ficam no catálogo.
- **Toda proposta visual vai como imagem ou protótipo jogável**, nunca como descrição (preferência do usuário vinda do colortrain).

## Arte
- **Estado atual (2026-10-01):** os 38 gatos usam as **imagens originais dos memes**, entregues pelo usuário em `~/Downloads/memes-cat-final` com o pedido de não alterar nada. Cada uma está em `arte/bruto/<id>/imagem.jpg`, registrada em `arte/origem.json` com `"tipo": "original"`, o nome do arquivo e o sha256. O jogo recebe o arquivo copiado byte a byte: sem corte, sem recompressão, sem tirar texto ou marca. A única coisa derivada é a `mini.webp` do álbum, com a imagem inteira.
- **Risco aberto, decisão do usuário:** essas imagens são fotos e artes de terceiros sem licença verificada.
  - A Poki recusa IP sem licença.
  - Há marcas registradas: Grumpy Cat, Nyan Cat, Pusheen e Keyboard Cat.
  - Há texto e logos de terceiros nas imagens: Know Your Meme, LEGO, Animal Planet e o site de cripto "$OIIAOIIA" com botão BUY.
  - A German Cat traz a silhueta de um soldado batendo continência.
  - O `npm run arte` e o `npm run poki` avisam disso a cada execução.
  - Para publicar, troque pelas versões de IA (o caminho abaixo continua pronto) ou obtenha as licenças.
- **Dois tipos de entrada** por gato em `arte/bruto/<id>/`, decididos pelo registro em `arte/origem.json`:
  - `"tipo": "original"`: só `imagem.(jpg|png|webp)`, usada como veio. Registro: `arquivo`, `fonte`, `data`, `edicoes` e, se houver, `sha256`, que o `npm run arte` e o teste conferem;
  - **IA + edição**, o padrão: `fundo.png` (o cenário sem o gato) e `gato.png` (o recorte transparente, no mesmo enquadramento), ou só `imagem.png` sem recorte. Registro: `ferramenta`, `plano`, `prompt`, `data`, `edicoes`. Sai em WebP quadrado de 1024 px.
- `npm run arte`:
  - valida o registro;
  - gera os arquivos e a `mini.webp` de 256 px;
  - regenera o manifesto (`{ arq, gato }` por gato);
  - avisa se a carga inicial passar de 1,5 MB.
- **Sem arte no manifesto, ou se a imagem falhar, o jogo usa o gato provisório.**
- Os campos `cor` e `olhos` do catálogo foram medidos nas imagens atuais. `olhos` só é usado nas reações chorar e brilhar. Trocou a imagem, meça de novo.

## Poki
- O SDK entra por uma tag síncrona no `<head>`, com o comentário "Unico script externo permitido pela Poki".
- **Eventos:**
  - `gameLoadingFinished` quando o primeiro nível aparece;
  - `gameplayStart` só em pointerdown ou clique real; tocar no gato revelado não conta;
  - `gameplayStop` na revelação e ao abrir o álbum.
- **`commercialBreak`** só no ▶ entre níveis, a partir da entrada do nível 4 (`NIVEIS_SEM_INTERVALO = 3`).
- **Rewarded** (dica) só por escolha do jogador, e o prêmio só vale com `=== true`. Sem SDK, os botões de vídeo somem. No localhost o prêmio é liberado para testes.
- **Som:** fica mudo antes do anúncio e quando a aba fica oculta.
- **Telemetria:** os nomes ficam fixos, `measure('level', N, 'start'|'complete')`.

## Comandos
- `npm test`: lógica, curva, catálogo, manifesto de arte, wrapper do SDK e estilo.
- `npm run servir`: servidor em http://127.0.0.1:5340/. Parâmetros locais:
  - `?nivel=12` e `?gato=oiia`;
  - `?auto=300` (joga sozinho e passa de nível);
  - `?fixo`, `?semanuncio`, `?album`, `?todos` (álbum completo);
  - `?revelar` (resolve e mostra a reação).
- `npm run arte`: processa `arte/bruto/` (ver acima). `--so=banana,oiia` processa só esses.
- A build tem 2,8 MB, quase tudo JPEG, que não comprime. A carga inicial é só o gato do nível e a pré-carga do próximo.
- `npm run sdkcheck`: banco do SDK falso (`tools/sdkcheck.html`) nos cenários normal, recusa, bloqueado, pendente e lsquebrado.
- `npm run poki`, na ordem:
  1. testes;
  2. `dist/` com verificação;
  3. zip em `dist-poki/meme-cats-puzzle-<versao>.zip`;
  4. sdkcheck sobre a build;
  5. prints nos tamanhos de iframe da Poki.
- Rode um Chrome headless por vez. No headless o rAF só roda na captura: para ver uma reação num instante exato, chame `__mc.cena.reagir(performance.now())` e capture depois de N ms.

## Por que não é clone (catálogo consultado em 2026-10-01)
- **Na Poki:** a categoria Meme é dominada por brainrot (Brainrot Puzzle, Craft, Merge, Merge Rot), Skibidi e 67. Os jogos de gato (Meow Merge, Cats Drop, Find a cat, Longcat) têm outras mecânicas. Não há quebra-cabeça de gatos de meme.
- **Fora da Poki** existe "Cat Memes: Cats and Meme Puzzles!" (game-game.com): 50 imagens de IA com peças quadradas e estáticas. Os diferenciais nossos:
  - a revelação animada com a reação de cada meme, com fala e som;
  - o gato em camada separada do fundo (na arte de IA; a foto original anima inteira);
  - o álbum que vira brinquedo (tocar repete a reação);
  - a cola entre peças certas;
  - a entrada que mostra a imagem e embaralha voando.
- **Risco aberto:** checar se o nome "Meme Cats Puzzle" está livre antes de publicar.
