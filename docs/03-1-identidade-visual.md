# 3.1 Identidade visual

## 3.1.1 Direção

A mesa imita uma **mesa clássica de baralho, coberta de feltro** verde ou
vinho, e por cima dela as cartas e a interface têm estética de jogo em pixel
art, com bastante "suco": cartas que flutuam e balançam, inclinação 3D ao
passar o mouse, viradas com estalo, partículas e números que saltam. A
referência é o tipo de sensação de jogos de cartas como Balatro (impacto,
movimento contínuo, feedback em cada ação), mas o visual é próprio: cartas,
cores, fundo e sons foram desenhados para este projeto, sem copiar arte,
nome ou elementos de nenhum jogo.

| Feltro verde | Feltro vinho |
|---|---|
| ![Mesa verde](assets/mesa-desktop.webp) | ![Mesa vinho](assets/mesa-vinho-desktop.webp) |

Princípios:

1. **Toda ação responde.** Comprar, soltar, virar, agrupar, embaralhar: cada
   uma tem som, movimento e, quando faz sentido, partícula ou texto.
2. **Os efeitos valem para todos.** Eles nascem do último evento do estado
   (`view.last`), e não do gesto local, então quem está do outro lado vê e
   ouve a mesma coisa.
3. **Sombra dura, sem desfoque.** Painéis, botões e cartas usam sombra deslocada
   de cor sólida, como em pixel art. Nada de `blur` em sombra.
4. **Movimento com peso.** Molas levemente subamortecidas (passam um pouco do
   alvo e assentam), nunca deslizes lineares.

## 3.1.2 Tema

**Tema único, escuro.** Não há modo claro. A mesa é um ambiente de jogo, e um
modo claro exigiria redesenhar fundo, cartas e efeitos. `color-scheme: dark`
está definido em `:root`.

## 3.1.3 Tokens de cor

Todos em [`src/index.css`](../src/index.css), no formato `H S% L%` (sem
`hsl()`), para o Tailwind poder aplicar opacidade (`bg-card/80`).

### Interface

| Token | Valor | Uso |
|---|---|---|
| `--background` | `224 36% 9%` | Fundo da página |
| `--foreground` | `44 45% 93%` | Texto principal (creme) |
| `--card` | `226 30% 14%` | Painéis, barra, bandeja da mão |
| `--popover` | `226 32% 12%` | Menus |
| `--primary` | `41 96% 58%` | Dourado: destaque, título, botão principal, alvo de soltura |
| `--secondary` | `206 86% 58%` | Azul: botão secundário, seletor ativo |
| `--muted` | `226 24% 21%` | Fundo de contadores e botões pequenos |
| `--muted-foreground` | `224 18% 72%` | Texto secundário |
| `--accent` | `226 26% 24%` | Hover |
| `--destructive` | `3 80% 60%` | Sair, remover, reiniciar |
| `--border`, `--input` | `226 24% 32%` | Bordas |
| `--ring` | igual a `--primary` | Foco |
| `--shadow` | `228 55% 4%` | Cor das sombras duras |

### Mesa e cartas

| Token | Uso |
|---|---|
| `--pc-paper` | Frente da carta |
| `--pc-ink` | Naipes pretos e texto da carta |
| `--pc-red` | Naipes vermelhos |
| `--pc-edge` | Contorno da carta |
| `--pc-back`, `--pc-back-deep` | Verso (padrão xadrez diagonal) |
| `--pc-shine` | Brilho que segue o mouse |

### Feltro

Duas mesas, no tom das mesas de jogo clássicas. O verde é o padrão; o vinho
redefine os tokens em `:root[data-felt='wine']`. Quem troca o atributo é
[`src/lib/felt.ts`](../src/lib/felt.ts).

| Token | Verde | Vinho | Uso |
|---|---|---|---|
| `--felt-green`, `--felt-wine` | `150 52% 22%` | `349 55% 23%` | Cor de cada pano (também nas amostras do seletor) |
| `--felt-base` | `var(--felt-green)` | `var(--felt-wine)` | Cor do pano em uso |
| `--felt-light` | `145 42% 33%` | `352 42% 34%` | Luz da luminária sobre o centro da mesa |
| `--felt-dark` | `156 62% 8%` | `345 60% 8%` | Bordas escurecidas e cor da barra do navegador no celular |
| `--felt-line` | `140 30% 62%` | `350 36% 66%` | Linha "impressa" no pano em volta da área de jogo e o texto de dica |
| `--felt-thread-light`, `--felt-thread-dark` | branco e preto | iguais | Fios da textura. Neutros, porque a cor vem do pano por baixo |

### Assentos

`--seat-0` até `--seat-7`: uma cor por assento, usada no ponto da etiqueta do
jogador e no contorno da carta que ele está arrastando. Acesse com
`seatColor(seat)` de [`src/game/stage.ts`](../src/game/stage.ts).

### Cor fora do CSS

Canvas não enxerga classes. Use
[`tokenColor('--primary', 0.5)`](../src/lib/tokens.ts) para obter uma string
CSS a partir do token. Nunca escreva um `#hex` ou `rgb()` no código.

## 3.1.4 Feltro da mesa

O fundo imita o pano de uma mesa de jogo. Ele é montado em camadas de CSS
(classe `.felt-bg`), da de baixo para a de cima:

1. **cor do pano** (`--felt-base`);
2. **luz da luminária**: elipse mais clara sobre o centro (`--felt-light`);
3. **bordas escuras**: elipse que escurece os cantos (`--felt-dark`);
4. **textura de tecido**: imagem repetida a cada 320px, gerada uma vez por
   [`src/lib/feltTexture.ts`](../src/lib/feltTexture.ts).

A textura tem três ingredientes, todos quase transparentes: manchas largas e
médias (o pano nunca tem cor uniforme), grão fino ponto a ponto (a "penugem"
do feltro) e fibras soltas, curtas e curvas, em todas as direções. Ela é
repetível sem emenda (o que sai por uma borda entra pela oposta) e usa
semente fixa, então sai igual em todo carregamento e em todo aparelho.

Em volta da área de jogo há uma linha "impressa" no pano, como nas mesas de
cassino: um traço contínuo e um filete interno mais fraco (`--felt-line`).

A escolha entre verde e vinho é de cada jogador, fica no navegador
(`vcp.felt`) e aparece no menu da mesa e na tela de entrada. Ela não muda a
mesa dos outros jogadores.

Não há linhas de varredura de monitor por cima da mesa: elas riscavam o feltro
em faixas horizontais e tiravam a sensação de tecido.

## 3.1.5 Adversários e barra ampliada

**Leques de cartas** (padrão): a mão de cada adversário em mini
leque de versos, lado a lado no topo, com o nome numa pequena placa
embaixo. Sem caixa em volta: as cartas ficam direto sobre o feltro, como na
mesa de verdade. Até 12 versos aparecem; acima disso o leque fica mais
fechado e a contagem mostra o total. No celular deitado os versos encolhem.

**Etiquetas** (alternativa, no menu): caixas compactas na barra superior com
cor do assento, nome, mini versos e contagem. Ocupam menos altura.

**Barra ampliada**: aparece por cima do topo quando uma carta arrastada chega
perto dele. Mesmo desenho da visão escolhida, só que bem maior (etiquetas de
60px de altura, 52px em tela estreita; versos de 34x48px). O alvo sob a carta
ganha fundo de destaque, e a própria carta encolhe para 55% e fica
translúcida (`.pc-sprite[data-over-player]`).

| Barra ampliada no desktop (leques) | Barra ampliada no celular (etiquetas) |
|---|---|
| ![Barra ampliada no desktop](assets/barra-ampliada-desktop.webp) | ![Barra ampliada no celular](assets/barra-ampliada-celular.webp) |

## 3.1.6 Ícone (favicon)

Desenho próprio em [`public/favicon.svg`](../public/favicon.svg): feltro
verde com cantos arredondados, um verso azul e uma carta com copas, nas cores
dos tokens (escritas no arquivo, porque uma imagem não lê CSS). Derivados:
`favicon.ico` (16, 32 e 48px) e `apple-touch-icon.png` (180px, sem
transparência e sem cantos, que o iOS arredonda sozinho). Os três estão
declarados no `index.html`; sem isso o navegador usaria o ícone da raiz do
domínio. Ao mudar o SVG, gere os derivados de novo a partir dele.

## 3.1.7 Tipografia

| Item | Valor |
|---|---|
| Fonte | **Jersey 15** (pixel), via `@fontsource/jersey-15`, empacotada |
| Família no Tailwind | `font-sans` aponta para ela, com fallback monoespaçado |
| Corpo | 16px |
| Peso | só 400; `font-synthesis: none` impede o navegador de "engrossar" e borrar |
| Título da entrada | `text-3xl` em `text-primary` |

Ela foi escolhida entre outras fontes pixel por ser a mais legível em tamanho
pequeno com acentos do português (testado em 14 a 16px). Pixel fonts precisam
de tamanhos maiores que fontes comuns: o menor texto da interface é 14px.

Dentro da carta, o tamanho vem do sprite: `font-size` é 20% da largura da
carta e todas as medidas internas são em `em`. A carta escala inteira, do
celular ao desktop, sem regras próprias.

## 3.1.8 Cartas

- Proporção 5:7, cantos de `0.42em`.
- Índice (valor e naipe) nos dois cantos, o de baixo girado 180 graus.
- Centro: naipe grande; o Ás tem naipe maior; J, Q e K têm um quadro com a letra.
- Naipes em SVG ([`SuitIcon`](../src/components/game/CardFace.tsx)), nunca
  caracteres Unicode, que viram emoji em vários celulares.
- Verso com padrão xadrez diagonal e moldura creme.
- Sombra: elemento próprio (`.pc-shadow`), deslocado para longe do centro da
  tela, como se a luz viesse do centro. Cresce quando a carta é levantada.

## 3.1.9 Animações e efeitos

| Efeito | Onde | Como |
|---|---|---|
| Feltro | Toda a tela, na mesa e na entrada | [`FeltBackground`](../src/components/game/effects/FeltBackground.tsx): cor do pano, luz da luminária, bordas escuras e textura de tecido. Estático |
| Vinheta | Por cima de tudo | `.stage-crt`, gradiente radial |
| Flutuação | Cartas da mesa e da mão | `@keyframes pc-bob`, cada carta com atraso próprio |
| Inclinação 3D | Hover do mouse | Variáveis `--rx`, `--ry` escritas direto no elemento |
| Brilho | Hover do mouse | Gradiente radial em `--sx`, `--sy` |
| Inclinação no arrasto | Carta segurada | Gira na direção do movimento e volta ao eixo |
| Voo | Toda mudança de lugar | Mola (`stiffness 360`, `damping 30`) |
| Virada | Tocar na carta | `rotateY` com curva que passa do ponto |
| Pulo | Carta que pousou, foi virada, chegou à mão ou mudou de lugar no leque | Escala 1.2, 0.93, 1 |
| Vaga aberta | Mão e grupo em leque, durante o arrasto | As cartas se afastam onde a carta vai entrar |
| Barra ampliada | Topo, durante o arrasto | Mola de cima para baixo; some ao afastar a carta |
| Poeira | Carta pousada na mesa | Partículas creme para os lados |
| Faíscas | Grupo criado | Partículas dourado e creme em círculo |
| Confete | Baralho adicionado, jogo reiniciado | 40 partículas de quatro cores |
| Texto flutuante | `+1` ao entregar, `+52` ao adicionar, `-N` ao remover | Sobe, cresce e some |
| Tremor de tela | Embaralhar, reiniciar | Web Animations API no palco |
| Embaralhada | Monte | Camadas do monte se abrem e fecham |

Sons ([`sfx.ts`](../src/lib/sfx.ts)): todos sintetizados (ruído filtrado e tons
curtos), com pequena variação de tom a cada toque. Botão de som no menu; a
escolha fica no navegador.

### Movimento reduzido

Com `prefers-reduced-motion: reduce`: sem flutuação, sem embaralhada animada, sem partículas e sem tremor.
O voo das cartas continua, porque ele informa o que aconteceu.

### Custo

Os efeitos foram pensados para celular: o feltro é estático e sua textura é
desenhada uma única vez, o laço de partículas só existe enquanto há partícula viva, a sombra é um
elemento e não `filter`, e o arrasto não renderiza o React por quadro.
