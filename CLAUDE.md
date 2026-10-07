# Meme Cats Puzzle

Quebra-cabeça de troca com gatos de meme, para a Poki. É inspirado no Brainrot Puzzle (Playrea), que fez 1 milhão de partidas num dia em maio de 2025. Feito **só com HTML + JavaScript**: ES modules nativos, canvas 2D e WebAudio, no mesmo padrão do `../colortrain`. Nada de bundler, framework ou TypeScript. O jogo publicado não tem dependência nenhuma, e as ferramentas usam o Node 18+, o Chrome, o ImageMagick (`magick`) e o `zip`/`unzip`.

O plano aprovado fica em `~/.claude/plans/leia-esse-artigo-e-hidden-swing.md`.

## Regra do jogo
- **Imagem e grade.** A imagem de um gato vira uma grade de peças. Ela aparece inteira por um instante e embaralha num desarranjo: nenhuma peça começa no lugar.
- **Troca.** Arrastar uma peça até outra, ou tocar numa e depois na outra, troca as duas.
- **Trava e cola.** Peça no lugar certo trava (clique, brilho, não mexe mais). Peças certas vizinhas perdem a borda entre si, e a imagem vai colando.
- **Combo.** Cada troca que trava pelo menos uma peça é um acerto. A nota sobe um grau por acerto e nunca chega ao fim: é um tom de Shepard (`notaSemFim` em `audio.js`). A partir do 2º acerto seguido aparece o selo 2x, 3x… sobre a peça, com a cor mudando a cada dois acertos. Uma troca que não trava nada zera o combo. A dica também conta como acerto.
- **PERFECT!** Nível montado sem nenhuma troca que não travou. O selo bate na tela e a revelação espera `PERFEITO_MS` (1 s). O `?revelar` não mostra o PERFECT.
- **Revelação.** Montada a imagem, o gato ganha vida com a reação do meme (animação, fala e som) e entra no álbum. O botão ▶ leva ao próximo gato. Tocar no gato repete a reação.
  - **Contador:** quando a reação acaba, o ▶ conta 2, 1 em 2 s (número no botão e anel branco esvaziando) e passa sozinho. Se o jogador tocar no gato, abrir o álbum ou esconder a aba, o contador para e o ▶ só pulsa. Fica em `contar` e `pararContagem` (`main.js`), com `J.conta`.
- **Sem derrota e sem cronômetro.**
  - **Espiar:** uma vez por nível, mostra a imagem inteira por 2 s.
  - **Empacou:** conta depois de 3 trocas seguidas que não travam (`ERROS_AJUDA`).
    - Na 1ª vez do nível, o Espiar recarrega e pulsa.
    - Da 2ª vez em diante, a mão do tutorial mostra de graça uma troca certa, e a Dica pulsa.
    - O pulso para no próximo acerto (o do Espiar também quando ele é usado). O vídeo continua só por escolha do jogador.
    - Veio do Player Fit da 0.2.2: de 23% a 62% dos jogadores empacavam por nível, e só 10% usavam o Espiar.
  - **Dica:** vídeo recompensado que coloca 3 peças certas (`PECAS_DICA`). A mão aponta a 1ª troca, e o jogo faz as 3 em sequência, somando no combo.
- **Curva** (`src/jogo/curva.js`): 2x2 (tutorial com a mão), 3x3, 3x4, 4x4, 4x5, 5x5, 5x6 e 6x6. O 4x4 só começa no nível 9: no Player Fit, a estreia do 4x4 derrubava cerca de 30%. A curva termina no último gato (hoje o nível 30). Do nível 31 em diante, os gatos voltam como variantes, com a grade girando entre 5x5, 5x6 e 6x6.
- **Imagem retangular:** o quadro tem a proporção da imagem, sem corte. `gradeParaImagem` troca a grade da curva por uma com quase o mesmo número de peças e peças perto de quadradas (até 8x8). Uma foto 16:9 no nível 10, por exemplo, vira 5x3. O `main.js` passa um limite de colunas e linhas para o lado menor da peça não ficar abaixo de `PECA_MIN` (56 px CSS). Só o celular em pé muda: do nível 12 em diante, a foto 16:9 fica em até 6x3 ou 6x4.
- **Peças iguais** (`src/jogo/iguais.js`): áreas lisas da foto (parede branca, fundo verde, tarja preta) viram peças que ninguém distingue. Peças que parecem iguais formam uma classe e travam em qualquer célula da classe; parte delas já começa travada.

## Estrutura
- **`src/jogo/`: lógica pura** (sem DOM, sem relógio e sem sorteio fora de `core/rng.js`):
  - `tabuleiro.js`: `pos[celula] = peca`, `classe` opcional, trocar, travar, `dica`, `colada`;
  - `curva.js`: `grade` e `gradeParaImagem`;
  - `iguais.js`: classes de peças iguais a partir da imagem reduzida;
  - `catalogo.js`: os 30 gatos, com nomes EN/PT/ES, raridade, `reacao`, `cor`, `olhos` e `fala`.
- **`src/render/`:**
  - `layout.js`: geometria pura;
  - `cena.js`: moldura, peças com tween e cola, seleção, arrasto, mão, espiada, selo de combo, PERFECT e revelação;
  - `palco.js`: as 8 reações. Cada pose é função pura do tempo, e as `BATIDAS` são os mesmos instantes que o som usa. Na foto sem recorte, a imagem inteira é a figurinha que faz a reação (pode sair do quadro);
  - `imagens.js`: arte pelo manifesto ou gato provisório, cache de até 3 gatos, miniaturas e a amostra para as peças iguais;
  - `provisorio.js`: o gato desenhado em canvas, só para quando a imagem falha ao carregar.
- **`src/arte/`: arte processada**, que é **gerada** por `npm run arte`. O `manifesto.js` também é gerado; não edite à mão.
- **`src/core/`:**
  - `poki.js`, cópia do colortrain, com fila e prazos;
  - `audio.js`: síntese, incluindo a voz de gato por formantes, a nota sem fim do combo e os sons das reações;
  - `armazenamento.js`, `depuracao.js` e `rng.js`.
- **`src/ui/`:**
  - `album.js`: figurinhas por raridade e um palco que repete a reação a cada toque;
  - `estilo.css`;
  - as fontes Fredoka (OFL, em `LICENCAS.txt`).
- **`src/main.js`** liga tudo. O estado do jogo fica no objeto `J`:
  - `J.fase` percorre `carregando`, `entrando`, `jogando`, `revelando` e `trocando`;
  - `J.gen` sobe a cada `iniciarNivel`. Todo callback assíncrono (o `await` do anúncio e do carregamento de imagem, o `depois(ms, fn)`) guarda a geração e desiste se ela mudou. Timer ou `await` novo no `main.js` precisa da mesma guarda, senão vaza para o nível seguinte;
  - o save (chave `save`, `VERSAO_SAVE = 1`) guarda nível, mudo e gatos do álbum. Gato que sai do catálogo é filtrado na carga. Mudou o formato, suba a versão.
- **Ordem dos gatos = ordem dos níveis:** `gatoDoNivel(n)` é `CATALOGO[n-1]`, e a última linha de `CURVA` fecha no total de gatos. Para tirar, pôr ou reordenar gatos, use a curadoria (ver Arte). Ela mexe junto em:
  - `catalogo.js`, `CURVA` e o manifesto;
  - `arte/bruto/<id>/`, `arte/origem.json` e `arte/removidos/`.

  Depois, atualize à mão os números deste arquivo e do `docs/arte/guia.md`. Os testes do catálogo não fixam a ordem nem o número de gatos.

  A curadoria não restaura gato excluído. Para trazer um de volta, faça à mão o caminho inverso: a imagem volta para `arte/bruto/<id>/`, o registro para `arte/origem.json` e a linha para o catálogo, e depois rode `npm run arte -- --so=<id>`.

  **Critério da ordem (0.2.3, a partir do Player Fit):** os níveis 3 a 8 decidem os 3 minutos.
  - Ali entram os memes famosos com imagem de alto contraste e regiões distintas.
  - Foto escura ou pouco conhecida vai para depois. Com o Smudge no nível 4, 31% saíam.
  - O banana fica no nível 3, e não no 1. A imagem tem dois painéis, e no 2x2 a troca das metades deixaria a imagem embaralhada com cara de montada.
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
  - `src/jogo/` não usa sorteio, DOM nem relógio. O teste procura o texto, inclusive em comentário: `Math.random`, `document.`, `window.`, `Date.now`, `performance.now` e `setTimeout`;
  - sem `console.log`, `console.info` nem `console.debug`;
  - a única URL externa é o SDK da Poki;
  - o `index.html` pede `viewport-fit=cover`.
- **Um relógio só:** `performance.now()`, passado como `agora` para a cena e o palco. O carimbo do `requestAnimationFrame` não é usado.
- O texto é quase todo em ícone. EN é o padrão, com PT e ES em `src/i18n/textos.js`. Os nomes dos gatos ficam no catálogo.
- **Toda proposta visual vai como imagem ou protótipo jogável**, nunca como descrição (preferência do usuário vinda do colortrain).

## Arte
- **Estado atual (2026-10-06, depois da curadoria e da 0.2.3):** os 30 gatos usam as **imagens originais dos memes**. Há dois grupos:
  - 24 vieram do usuário em `~/Downloads/memes-cat-final`. O banana saiu na curadoria e voltou na 0.2.3, com o registro original;
  - 6 foram enviadas na curadoria: `wig`, `salad`, `ok`, `tuxedo`, `surprised` e `serious`. O título delas foi dado por Claude a partir da imagem.

  Cada uma está em `arte/bruto/<id>/imagem.(jpg|webp)`, registrada em `arte/origem.json` com `"tipo": "original"`, o nome do arquivo e o sha256.
  - **Sem corte:** o jogo recebe o arquivo byte a byte.
  - **Com corte:** 9 gatos foram cortados nas bordas (campo `corte`), e o jogo recebe o recorte em JPEG.
  - **Excluídos na curadoria:** bingus, fits-sits (a caixa da LEGO), german, grumpy, keyboard, lil-bub, nyan, omg, pusheen, side-eye e wiwiwi, guardados em `arte/removidos/`.
- **Risco aberto, decisão do usuário:** essas imagens são fotos e artes de terceiros sem licença verificada.
  - A Poki recusa IP sem licença.
  - As marcas registradas conhecidas (Grumpy Cat, Keyboard Cat, Nyan Cat e Pusheen) saíram na curadoria.
  - Os logos de terceiros saíram com os gatos: a Know Your Meme (Keyboard Cat), a caixa da LEGO (If I Fits), o Animal Planet (Lil Bub) e a silhueta do soldado (German Cat). Fica a legenda do próprio meme no Should Buy a Boat Cat ("I should buy a boat.").
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
- **Curadoria** (`tools/curadoria.html`, aberta pelo `npm run servir`): o usuário reordena os níveis (arrastando, com ◀ ▶ ou pelo número), corta bordas, exclui gatos e adiciona imagens novas. Nada muda até salvar.
  - **Gravação:** pelo `POST /__curadoria` (`tools/curadoria.mjs`), sem ImageMagick, porque o navegador codifica as imagens. O servidor confere o pedido inteiro antes de gravar e recusa sem mexer em nada se faltar gato, sumir uma reação, um nome passar de 22 letras etc.
  - **O que reescreve:** `src/jogo/catalogo.js` (as linhas existentes vão intactas, na ordem nova), `src/jogo/curva.js` (a última faixa termina no número de gatos) e `src/arte/manifesto.js` (via `tools/manifesto.mjs`, o mesmo do `arte.mjs`).
  - **Corte:** o original em `arte/bruto/<id>/` fica intacto (o sha256 vale para ele). O campo `corte` (`{ x, y, w, h }`, em px do original) vai para `arte/origem.json`, e `src/arte/<id>/imagem.jpg` recebe o recorte (JPEG 92) com a `mini.webp` nova. Sem corte, volta a cópia byte a byte. O `npm run arte` aplica o mesmo corte com o `magick`, e o teste confere o tamanho.
  - **Imagem nova:** entra direto no catálogo, na posição escolhida. Os bytes vão como vieram para `arte/bruto/<id>/imagem.<ext>`, com registro `"tipo": "original"`. O título vai em EN, PT e ES (até 22 letras), e a fala é opcional. A reação é escolhida ou, se for automática, fica com a menos usada. A raridade é escolhida (padrão `comum`). A `cor` sai da faixa de cor dominante da imagem, e `olhos` fica no padrão. Se a reação for chorar ou brilhar, meça os `olhos` à mão.
  - **Exclusão:** nada é apagado. `arte/bruto/<id>/`, o registro e a linha do catálogo vão para `arte/removidos/<id>/`; `src/arte/<id>/` sai da build.
  - **Testes:** os do catálogo não fixam mais a ordem nem o número de gatos; a curva acompanha.
- **Sem arte no manifesto, ou se a imagem falhar, o jogo usa o gato provisório.**
- Os campos `cor` e `olhos` do catálogo foram medidos nas imagens atuais. `olhos` só é usado nas reações chorar e brilhar. Trocou a imagem, meça de novo.

## Poki
- O SDK entra por uma tag síncrona no `<head>`, com o comentário "Unico script externo permitido pela Poki".
- **Eventos:**
  - `gameLoadingFinished` quando o primeiro nível aparece;
  - `gameplayStart` só em pointerdown ou clique real; tocar no gato revelado não conta;
  - `gameplayStop` na revelação e ao abrir o álbum.
- **`commercialBreak`** só na passagem entre níveis (o ▶ ou o fim do contador), a partir da entrada do nível 4 (`NIVEIS_SEM_INTERVALO = 3`). O contador nunca chama `gameplayStart`: o próximo nível espera um toque real.
- **Rewarded** (dica) só por escolha do jogador, e o prêmio só vale com `=== true`. Sem SDK, os botões de vídeo somem. No localhost o prêmio é liberado para testes.
- **Som:** fica mudo antes do anúncio e quando a aba fica oculta.
- **Telemetria:** os nomes ficam fixos.
  - `measure('level', N, 'start'|'complete')`: o funil de progresso.
  - `measure('level', N, 'stuck')`: o jogador empacou no nível. Aparece em Other Events.
  - `measure('button', 'peek'|'hint', 'visible'|'interact')`: botões de ajuda. Aparece em Interaction Events. `visible` sai no começo do nível (o da Dica só com SDK) e quando o Espiar recarrega.

## Comandos
- `npm test` (`node --test test/*.test.js`, sem dependências): lógica, curva, catálogo, manifesto de arte, wrapper do SDK, nota sem fim e estilo.
  - Um arquivo só: `node --test test/tabuleiro.test.js`.
  - Um teste só: `node --test --test-name-pattern="colada" test/tabuleiro.test.js`.
  - `test/apoio/` tem o SDK falso e o relógio falso que o `poki.test.js` usa.
- `npm run servir`: servidor em http://127.0.0.1:5340/ (a curadoria fica em `/tools/curadoria.html`). Parâmetros locais:
  - `?nivel=12` e `?gato=crying`;
  - `?auto=300` (joga sozinho e passa de nível);
  - `?fixo`, `?semanuncio`, `?album`, `?todos` (álbum completo);
  - `?revelar` (resolve e mostra a reação).
- `npm run arte`: processa `arte/bruto/` (ver acima). `--so=crying,maxwell` processa só esses.
- A build tem cerca de 3 MB, quase tudo JPEG e WebP, que não comprimem. A carga inicial é só o gato do nível e a pré-carga do próximo.
- `npm run sdkcheck`: banco do SDK falso (`tools/sdkcheck.html`) nos cenários normal, recusa, bloqueado, pendente e lsquebrado.
- `npm run poki`, na ordem:
  1. testes;
  2. `dist/` com verificação (`tools/empacotar.mjs`). A build copia `index.html`, `LICENCAS.txt` e o `src/` **inteiro**: o que estiver em `src/` vai para a Poki. A verificação barra `.map`, URL externa, `console.log` e mais de 5 MB em gzip;
  3. zip em `dist-poki/meme-cats-puzzle-<versao>.zip`, com o `.sha256` ao lado (usa `zip` e `unzip` do sistema);
  4. sdkcheck sobre a build;
  5. prints nos tamanhos de iframe da Poki.
- As ferramentas de Chrome chamam o binário `google-chrome`. Rode um Chrome headless por vez. No headless o rAF só roda na captura: para ver uma reação num instante exato, chame `__mc.cena.reagir(performance.now())` e capture depois de N ms.
- `window.__mc` (`J`, `cena`, `executar`, `poki`, `audio`, `proximo` e `auto(ms)`) só existe no local ou com o gancho `window.__memecatsTeste` do `sdkcheck.html`.
- `node tools/thumb.mjs [a b c]` gera a thumb da Poki (`tools/thumb.html`) em 1256 e 628, em `marketing/thumb/opcoes/<opcao>-<tamanho>.png`. Tem Polite, Crying e Smudge, um deles de protagonista, porque o guia da Poki pede um objeto principal e não colagem:
  - a: partida com o Polite;
  - b: três peças, com o Polite trocando com o Crying;
  - c: partida com o Crying.
  A página lê as fotos pelo manifesto, e foto que falha pinta a tela de vermelho. A conferência em tamanho de tile, sobre o `#83FFE7`, fica em `docs/prints/thumb-grade-poki.png`.

## Por que não é clone (catálogo consultado em 2026-10-01)
- **Na Poki:** a categoria Meme é dominada por brainrot (Brainrot Puzzle, Craft, Merge, Merge Rot), Skibidi e 67. Os jogos de gato (Meow Merge, Cats Drop, Find a cat, Longcat) têm outras mecânicas. Não há quebra-cabeça de gatos de meme.
- **Fora da Poki** existe "Cat Memes: Cats and Meme Puzzles!" (game-game.com): 50 imagens de IA com peças quadradas e estáticas. Os diferenciais nossos:
  - a revelação animada com a reação de cada meme, com fala e som;
  - o gato em camada separada do fundo (na arte de IA; a foto original anima inteira);
  - o álbum que vira brinquedo (tocar repete a reação);
  - a cola entre peças certas;
  - a entrada que mostra a imagem e embaralha voando.
- **Risco aberto:** checar se o nome "Meme Cats Puzzle" está livre antes de publicar.
