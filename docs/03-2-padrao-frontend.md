# 3.2 Padrão de frontend

## 3.2.1 Componentes

- Componente de função com `const Nome = (props: NomeProps) => { ... }` e
  `export default Nome` no fim. Props tipadas em uma `interface` logo acima.
- Componente que aparece muitas vezes na tela (sprite de carta, etiqueta de
  grupo, etiqueta de jogador) usa `memo` e recebe **valores primitivos**, não o
  objeto inteiro. Assim só renderiza de novo quando algo dele muda.
- Texto visível sempre por `const t = useT()` e `t('chave')`. Ver
  [05-padroes-de-nomes.md](05-padroes-de-nomes.md) para as chaves.
- Primitivos de interface (botão, diálogo, menu, abas, checkbox) vêm de
  `src/components/ui/`. Não recrie.

## 3.2.2 Estado

| Tipo de estado | Onde fica |
|---|---|
| Estado do jogo (cartas, grupos, jogadores) | Só na sala. O cliente recebe `RoomView` por [`useRoom`](../src/hooks/useRoom.ts) e nunca altera |
| Gesto em andamento | [`useCardDrag`](../src/hooks/useCardDrag.ts) (`held`, `handGap`, `pileGap`, `hover`, `reachPlayers`) |
| Posição animada de cada carta | Valores de movimento do framer-motion, registrados no `SpriteRegistry` |
| Preferência do jogador (som, idioma, nome, cor da mesa, visão dos adversários) | `localStorage`, sempre dentro de `try/catch`. Preferência nova: use [`createPreference`](../src/lib/preference.ts) |
| Assento atual (para retomar depois de recarregar) | `sessionStorage` (um por aba, de propósito) |

Para mudar o jogo: monte uma `Action` e chame `room.send(action)`. Se o
resultado for `{ ok: false }`, mostre `t('error.' + código)`.

## 3.2.3 Alta frequência sem render

Coisas que mudam a cada quadro (posição durante o arrasto, inclinação do
mouse, rotação de arrasto) **não** passam por `useState`:

- posição e escala: `MotionValue.set()` direto no handle do registro;
- inclinação e brilho: `element.style.setProperty('--rx', ...)`;
- tremor de tela: `element.animate()` (Web Animations API).

Um `setState` por movimento do ponteiro em uma mesa com 100 cartas trava o
celular.

## 3.2.4 Estilos

- Estilos do jogo ficam em [`src/index.css`](../src/index.css), dentro de
  `@layer components`, com classes curtas (`.pc-sprite`, `.hud-pill`,
  `.hand-tray`). Use Tailwind para ajuste pontual de layout no JSX.
- Estados visuais por atributo `data-*` (`data-held`, `data-hover`,
  `data-face`, `data-zone`, `data-offline`), e não por classe condicional. O
  CSS fica legível e o mesmo atributo serve para testes.
- Cor só por token. Ver [03-1-identidade-visual.md](03-1-identidade-visual.md).
- `translate` e `rotate` como propriedades separadas quando o elemento também
  tem `transform` controlado pelo framer-motion, para um não sobrescrever o outro.

## 3.2.5 Alvos de soltura

Qualquer elemento pode receber cartas: basta ter `data-drop`.

| `data-drop` | O que acontece ao soltar |
|---|---|
| `table` | Carta vai para a mesa na posição solta |
| `hand` | Carta vai para a sua mão, na vaga mais próxima |
| `deck` | Carta volta para o topo do monte |
| `player:ID` | Carta vai para a mão daquele jogador |
| `card:ID` | Forma um grupo com aquela carta (se os centros estiverem próximos) |
| `pile:ID` | Carta entra naquele grupo: no topo, se em pilha; na vaga mais próxima, se em leque (também reordena dentro do próprio leque). O leque aceita a carta também pelo centro dela, com folga, mesmo que o ponteiro esteja fora |

O controlador usa `document.elementsFromPoint`, então sobreposição, rotação e
z-index valem exatamente como a tela mostra.

## 3.2.6 Acessibilidade

- Botões de ícone têm `aria-label` e `title`.
- Diálogos têm título (e descrição, mesmo que `sr-only`).
- O indicador de reconexão tem `role="status"`.
- Movimento reduzido é respeitado (ver identidade visual).
- Limitação conhecida: as cartas não são operáveis por teclado.
