# 2026-11-17: grupo inteiro como uma carta e ordem do leque

## Motivo

Pedidos:

1. Fazer com um grupo inteiro (pilha ou leque) o que já se fazia com uma
   carta: levar ao monte, a outro jogador, à própria mão, e unir com outro
   grupo.
2. Um botão ao lado da alça do leque para escolher a ordem das cartas: manilha,
   valor, ou voltar à ordem original (livre, o padrão). A ordenação é automática
   e se mantém quando cartas entram ou saem.

## O que mudou

- **`sendPile`** (motor): leva o grupo inteiro numa ação só para o monte (topo,
  fechado, ids novos), uma mão (a própria ou a de outro jogador), outro grupo
  (une, e o destino mantém posição, modo e ordenação) ou uma carta solta (que
  vira a base). Se o alvo entrou em outro grupo no caminho, une com esse grupo.
- **Arrasto do grupo**: o destino é o que estiver sob a etiqueta. A barra
  ampliada também aparece, e o grupo fica translúcido sobre um jogador.
- **`setPileSort` e `shared/pileOrder.ts`**: o grupo guarda `sort` (`manual`,
  `rank`, `manilha`). A ordem manual fica sempre guardada; ordenar é só um
  jeito de exibir, calculado igual por todos. Por isso a ordenação acompanha
  cartas que entram e saem, e voltar a "Livre" recupera a ordem manual.
  Cartas fechadas ficam no fim, fora da ordenação, para não revelar o valor.
- **Manilha**: força do truco, do 4 ao 3, com desempate pelo naipe das
  manilhas (ouros, espadas, copas, paus). 8, 9 e 10, se houver, depois do 7.
  As manilhas variáveis do truco paulista (a carta acima da vira) não entram:
  dependem da vira de cada mão.
- **`PileSortMenu`**: botão ao lado da alça, só com o grupo em leque.
- A etiqueta do grupo virou um contêiner com a alça e o botão; a alça continua
  centralizada embaixo do grupo.

## Validação

- `npm test`: 52 testes (6 novos de ordenação e 7 novos no motor para
  `sendPile`, `setPileSort` e salas antigas sem `sort`).
- Playwright, dois jogadores (desktop e celular com toque): união de grupos,
  ordenação por valor e por manilha vista igual pelos dois, carta nova entrando
  em leque ordenado, volta à ordem manual com a carta nova no fim, grupo para a
  própria mão, para o monte (toque), para a Bia pela barra ampliada e sobre uma
  carta solta (16 verificações).
- Roteiros anteriores repetidos sem falhas.
