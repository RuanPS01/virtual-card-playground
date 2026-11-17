# 2026-11-17: leque reordenável, adversários em leque, barra ampliada e favicon

## Motivo

Pedidos:

1. Um grupo aberto em leque na mesa não podia ter a ordem mudada à mão: as
   cartas ficavam na ordem em que foram amontoadas.
2. A página usava o favicon do domínio principal.
3. Ao arrastar uma carta para perto do topo, ampliar a barra de jogadores
   para ficar fácil ver para quem a carta vai.
4. Uma visão dos adversários com a mão de cada um em miniatura, como um
   leque, lado a lado no topo, com o nome. Pedida como alternativa e, em
   seguida, definida como a visão padrão.

## O que mudou

- **Motor:** `toPile` aceita `beforeId` ("antes da carta X"), o mesmo
  mecanismo da mão. Serve para reordenar dentro do grupo e para inserir uma
  carta vinda de fora numa posição. Se a carta de referência sair do grupo
  no meio do caminho, a carta vai para o topo. Três testes novos.
- **Arrasto no leque:** as outras cartas se juntam e uma vaga se abre onde a
  carta vai entrar (`pileGap`, como o `handGap` da mão). Soltar na mesma vaga
  não envia nada. O leque aceita a carta pela posição do centro dela, com
  folga: no celular, quem segura pela borda tinha o dedo fora do leque e a
  carta ia para a mesa.
- **Barra ampliada** (`PlayerReachBar`): aparece quando o ponteiro chega perto
  do topo, com alvos grandes, e some ao afastar (com folga para não piscar).
  Sobre um jogador, a carta encolhe e fica translúcida, e o título diz
  "Entregar para Fulano". É sobreposição: a mesa não se mexe.
- **Adversários em leque** (`OpponentFan`): visão padrão. As etiquetas
  continuam disponíveis no menu, em "Adversários". Preferência de cada jogador
  (`vcp.opponents`).
- **`createPreference`** (`src/lib/preference.ts`): o padrão de preferência no
  navegador virou utilitário; `felt.ts` passou a usá-lo.
- **Favicon** próprio (`public/favicon.svg`, `favicon.ico`,
  `apple-touch-icon.png`), declarado no `index.html` com o caminho da página.
- Ajuda ("Como jogar") com os gestos novos.

## Validação

- `npm test`: 34 testes.
- Playwright, reordenação no leque com dois jogadores (desktop com mouse e
  celular com toque): vaga aberta durante o arrasto, ordem igual nos dois,
  soltar na mesma vaga sem efeito, inserção vinda da mão na 2ª posição, carta
  tirada do leque para a mesa, pilha empilhada sem alteração (12 verificações).
- Playwright, quatro jogadores: troca para leques pelo menu, limite visual de
  12 versos, preferência individual e persistente, barra ampliada no desktop
  e no celular (alvos de 52px), entrega pela barra, barra some ao afastar,
  sem rolagem horizontal (16 verificações).
- Roteiros anteriores repetidos (jogo completo com três jogadores, tamanhos de
  tela e arrasto ao vivo).
- Favicon conferido em 16, 32, 48 e 180px; o build aponta os ícones para
  `/virtual-card-playground/`.
