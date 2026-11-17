# 2026-11-17: ordem de manilha escolhida pela sala

## Motivo

Pedido de escolher, no menu, a ordem de manilha usada pelos leques ordenados
"por manilha", com predefinições e a opção de personalizar. Antes a ordem era
fixa (força do truco, do 4 ao 3, sem manilhas).

## O que mudou

- **`shared/manilha.ts`**: `ManilhaConfig` com `preset`, `ranks`, `suits`,
  `manilhas` e `vira`. Predefinições: paulista sem vira (padrão), paulista com
  vira (manilha é o valor seguinte à vira, nos quatro naipes; depois do 3
  volta ao 4), mineiro e gaúcho (manilhas fixas). `sanitizeManilha` valida o
  personalizado e recalcula as predefinições a partir do nome.
- **Estado da sala**: `RoomState.manilha` e `RoomView.manilha`. É da sala, e não
  de cada jogador, porque o leque ordenado precisa aparecer igual para todos.
  Salas antigas voltam com o padrão.
- **Ação `setManilha`**, com aviso para todos ("Fulano mudou a ordem de manilha").
- **`sortPile`** recebe a configuração; `manilhaStrength` coloca as manilhas
  acima de todas as outras cartas.
- **Interface**: item "Ordem de manilha" no menu (mostra a atual) e o
  `ManilhaDialog`, com predefinições, escolha da vira, editor do personalizado
  (`OrderEditor`, por toque) e prévia do resultado (`CardChip`).

Isto substitui a limitação registrada em
[2026-11-17-grupo-inteiro-e-ordem-do-leque.md](2026-11-17-grupo-inteiro-e-ordem-do-leque.md):
as manilhas da vira e as fixas do mineiro e do gaúcho agora existem.

## Validação

- `npm test`: 62 testes (8 de manilha: cada predefinição, giro da vira,
  personalizado, recusa de listas inválidas, lista vazia apagada pelo banco e
  predefinição adulterada; 2 no motor: ação da sala e salas antigas).
- Playwright, dois jogadores (desktop e celular com toque): padrão no menu,
  mineiro aplicado pela Ana e visto pela Bia com aviso, vira K escolhida pela
  Bia no celular, personalizado com valor movido e manilha adicionada, leque
  conferido contra a força esperada a cada passo, e configuração mantida ao
  recarregar (14 verificações).
- Roteiros anteriores repetidos sem falhas.
