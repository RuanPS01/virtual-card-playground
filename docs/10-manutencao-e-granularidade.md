# 10. Manutenção e granularidade

## 10.1 Tamanho de arquivo

| Tipo | Alvo | Sinal de que precisa dividir |
|---|---|---|
| Componente | até ~150 linhas | Mais de uma responsabilidade visual, ou JSX que não cabe na tela |
| Hook | até ~250 linhas | Lida com mais de um assunto (ex.: arrasto e efeitos) |
| Módulo puro | até ~300 linhas | Funções que ninguém usa junto |
| Motor (`shared/engine.ts`) | exceção | Concentra todas as ações de propósito: ler uma ação tem que mostrar tudo o que ela faz |

A versão anterior tinha `Index.tsx` com mil linhas e `GameTable.tsx` com
novecentas, misturando rede, regras e interface. A divisão atual separa: o
motor sabe as regras, os transportes sabem a rede, os hooks ligam as duas
coisas à interface e os componentes só desenham.

## 10.2 Onde colocar algo novo

| É... | Vai para |
|---|---|
| Uma regra do que acontece com as cartas | Nova `Action` em `shared/types.ts` e um `case` em `shared/engine.ts`, com teste |
| Um cálculo de posição, tamanho ou camada | `src/game/layout.ts` ou `src/game/targets.ts` (funções puras) |
| Um efeito disparado por ação | `src/hooks/useViewEffects.ts` |
| Um som | `src/lib/sfx.ts` |
| Uma preferência do jogador (algo que só muda a tela de quem escolhe) | `createPreference` em `src/lib/preference.ts`, num módulo próprio como `felt.ts` |
| Uma parte visual da mesa | `src/components/game/` |
| Um texto | `src/lib/i18n.ts`, nos dois dicionários |
| Uma mensagem nova entre cliente e servidor | `shared/protocol.ts`, nos dois lados |

## 10.3 Adicionando uma ação nova (passo a passo)

1. Acrescente o tipo em `Action` ([`shared/types.ts`](../shared/types.ts)).
2. Implemente o `case` em `run` ([`shared/engine.ts`](../shared/engine.ts)),
   devolvendo um `EventDraft` (o que vira `state.last`) ou um `ErrorCode`.
3. Teste em [`shared/__tests__/engine.test.ts`](../shared/__tests__/engine.test.ts),
   inclusive o que acontece se dois jogadores agirem ao mesmo tempo.
4. Se precisar de efeito, adicione o `case` em `useViewEffects`.
5. Dispare pela interface com `room.send({ type: '...' })`.
6. Nada muda no servidor nem no transporte Firebase: os dois já aplicam
   qualquer ação pelo motor.
7. Atualize [05-padroes-de-nomes.md](05-padroes-de-nomes.md).

## 10.4 Comentários

Explique o **porquê**: a decisão, a alternativa descartada e o defeito que ela
evita. Não narre o código.

```ts
// Ruim: incrementa o contador de camadas
state.z += 1;

// Bom: quem foi tocado por último fica por cima, para todos os jogadores.
card.z = ++state.z;
```

Sem travessão nem seta em comentário (ver [00-regras-para-ia.md](00-regras-para-ia.md)).

## 10.5 Testes

- `shared/__tests__/engine.test.ts`: cada ação, os casos de concorrência
  (pedido que chega depois de o alvo mudar), invariantes (total de cartas) e o
  `normalizeState` do Firebase.
- `src/lib/realtime/__tests__/firebaseTransport.test.ts`: o transporte Firebase
  contra um banco em memória que imita transações e a remoção de vazios.

O comportamento visual (arrasto, tamanhos de tela, reconexão) foi validado com
Playwright em vários tamanhos de tela; esses roteiros não estão no repositório.
Ao mexer em layout ou arrasto, teste no navegador nos tamanhos de
[08-responsividade-mobile.md](08-responsividade-mobile.md).
