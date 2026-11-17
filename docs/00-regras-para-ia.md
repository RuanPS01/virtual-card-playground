# 0. Regras para IA

> **Leia este documento antes de qualquer alteração no projeto.** Ele vale para
> qualquer agente de IA (Claude Code, Copilot, Cursor, ChatGPT ou outro) e tem
> precedência sobre preferências próprias do modelo.

## 0.1 As três regras obrigatórias

### Regra 1: consultar a documentação ANTES de implementar

Antes de escrever a primeira linha, leia os documentos desta pasta que tocam o que
você vai mexer:

| Vou mexer em... | Leia antes |
|---|---|
| Qualquer coisa | [09-contexto-do-produto.md](09-contexto-do-produto.md) |
| Estrutura de pastas, camadas, servidor, transportes | [01-arquitetura.md](01-arquitetura.md) |
| Dependências, versões, build, deploy | [02-tecnologias.md](02-tecnologias.md) |
| Cores, tipografia, espaçamento, efeitos | [03-1-identidade-visual.md](03-1-identidade-visual.md) |
| Como escrever um componente, hook ou estilo | [03-2-padrao-frontend.md](03-2-padrao-frontend.md) |
| Telas e componentes existentes | [04-componentes.md](04-componentes.md) |
| Nomes de arquivos, tipos, ações, mensagens | [05-padroes-de-nomes.md](05-padroes-de-nomes.md) |
| Estado da sala, persistência, Firebase | [06-banco-de-dados.md](06-banco-de-dados.md) |
| Fluxos de entrar, jogar, arrastar, reconectar | [07-fluxos-aplicacao.md](07-fluxos-aplicacao.md) |
| Layout, tamanho de carta, qualquer coisa visual | [08-responsividade-mobile.md](08-responsividade-mobile.md) |
| Criar arquivo, componente ou hook novo | [10-manutencao-e-granularidade.md](10-manutencao-e-granularidade.md) |
| Provedores, prompts ou rotas de IA | [11-servico-de-ia.md](11-servico-de-ia.md) |

Consultar não é opcional: quase toda necessidade de "componente novo" já tem um
componente ou hook pronto documentado em [04-componentes.md](04-componentes.md).
Criar duplicata é o defeito mais comum de agentes em repositórios como este.

### Regra 2: atualizar a documentação DEPOIS de implementar

Se a alteração mudou qualquer informação registrada aqui, atualize o documento
correspondente **no mesmo trabalho**, não depois. Casos que sempre exigem atualização:

- criou, renomeou ou removeu uma página, um componente reutilizável ou um hook
  (atualize [04-componentes.md](04-componentes.md));
- criou ou mudou uma ação do motor, uma mensagem do WebSocket ou uma rota
  (atualize [01-arquitetura.md](01-arquitetura.md) e [05-padroes-de-nomes.md](05-padroes-de-nomes.md));
- criou ou mudou um campo do estado da sala ou o formato salvo no Firebase
  (atualize [06-banco-de-dados.md](06-banco-de-dados.md));
- mudou token de cor, tipografia, raio ou efeito visual
  (atualize [03-1-identidade-visual.md](03-1-identidade-visual.md));
- criou um padrão de layout responsivo reaproveitável
  (atualize [08-responsividade-mobile.md](08-responsividade-mobile.md));
- adicionou ou removeu dependência, ou mudou o deploy
  (atualize [02-tecnologias.md](02-tecnologias.md));
- mudou um fluxo do jogador
  (atualize [07-fluxos-aplicacao.md](07-fluxos-aplicacao.md) e [09-contexto-do-produto.md](09-contexto-do-produto.md)).

Mudanças grandes também ganham um registro em [historico/](historico/), com data,
motivo e o que mudou.

Documentação que descreve algo que não existe mais é pior que documentação
ausente: ela faz o próximo agente implementar contra uma realidade falsa. Se
encontrar uma informação defasada enquanto trabalha, corrija na hora, mesmo que
não seja o assunto da sua tarefa.

### Regra 3: nunca usar travessão nem caractere de seta

**Proibido** em qualquer texto gerado: título, rótulo (label), descrição,
placeholder, mensagem de toast, comentário de código, mensagem de commit, texto
de documentação, string de i18n.

| Proibido | Caractere | Use no lugar |
|---|---|---|
| Travessão | `—` (em dash) | dois pontos, vírgula, parênteses ou ponto |
| Meia-risca | `–` (en dash) | "a" e "até" em faixas, ou hífen simples `-` |
| Seta para a direita | `→` | "para", "leva a", "vira", "resulta em" |
| Seta para a esquerda | `←` | "vem de", "a partir de" |
| Outras setas | `⟶` `⇒` `↔` `⬅` `➜` | palavras equivalentes |

Exemplos de reescrita:

```
Ruim:  // Envia a ação — o servidor confirma depois.
Bom:   // Envia a ação. O servidor confirma depois.

Ruim:  toast.success("Sala criada — convide seus amigos")
Bom:   toast.success(t('toast.roomCreated', { room }))   // "Sala K7M2QX criada. Convide seus amigos!"

Ruim:  gesto → ação → motor → estado
Bom:   o gesto vira uma ação, que o motor aplica e transforma em estado novo
```

O hífen simples (`-`) é permitido. Setas desenhadas por **ícones** (`ArrowLeft`,
`ArrowDownWideNarrow` do lucide-react) e as setas de sintaxe do Mermaid (`-->`)
são permitidas: a regra é sobre CARACTERES de texto, não sobre ícones nem sintaxe.

Os únicos símbolos especiais que o jogo desenha são os naipes, e eles são SVG
([`CardFace.tsx`](../src/components/game/CardFace.tsx)), nunca caracteres
Unicode de baralho (que viram emoji em vários celulares).

## 0.2 Regras de implementação

Estas valem sempre, sem precisar pedir:

1. **Idioma da interface: pt-BR.** Toda string visível vive em
   [`src/lib/i18n.ts`](../src/lib/i18n.ts), nos dois dicionários (`ptBR` e `en`).
   O tipo de `en` é derivado de `ptBR`, então esquecer uma chave é erro de
   compilação. Nunca escreva texto solto no JSX.
2. **Nunca altere o estado do jogo fora do motor.** Toda mudança de cartas,
   grupos ou jogadores é uma `Action` aplicada por
   [`shared/engine.ts`](../shared/engine.ts). Componente que "conserta" o
   estado localmente recria exatamente os bugs de dessincronização que esta
   arquitetura eliminou. Ver [01-arquitetura.md](01-arquitetura.md).
3. **Toda ação referencia cartas pelo id, nunca pelo índice.** Índice muda
   quando outro jogador age ao mesmo tempo; id não.
4. **Posição na mesa é normalizada (0 a 1).** Nunca grave pixels no estado.
   Ver [08-responsividade-mobile.md](08-responsividade-mobile.md).
5. **Nunca use cor hardcoded.** Use os tokens de [`src/index.css`](../src/index.css)
   (`bg-card`, `text-foreground`, `border-border`, `hsl(var(--primary))`). Isso
   vale também para canvas e WebGL: leia o token com
   [`src/lib/tokens.ts`](../src/lib/tokens.ts). Ver
   [03-1-identidade-visual.md](03-1-identidade-visual.md).
6. **Tema único, escuro.** O jogo não tem modo claro de propósito (a mesa é um
   ambiente de jogo, como em jogos de console). Não adicione `dark:` nem um
   segundo conjunto de cores sem antes atualizar a identidade visual.
7. **Mobile é requisito, não polimento.** Toda tela precisa funcionar em 360px
   de largura em pé e em 640x360 deitado, sem scroll horizontal na página e sem
   carta fora da tela. Ver [08-responsividade-mobile.md](08-responsividade-mobile.md).
8. **Arrasto só por Pointer Events.** Nunca use o drag and drop nativo do HTML5
   (`draggable`, `onDragStart`): ele não funciona em tela de toque. Use
   [`useCardDrag`](../src/hooks/useCardDrag.ts).
9. **Reaproveite antes de criar.** Procure em `src/components/`, `src/hooks/`
   e `src/game/` (documentados em [04-componentes.md](04-componentes.md)) antes
   de escrever algo novo.
10. **Comente o POR QUÊ, não o o quê.** O padrão da casa é explicar a decisão e
    o defeito que ela evita, não narrar o código. Ver
    [10-manutencao-e-granularidade.md](10-manutencao-e-granularidade.md).
11. **Rode `npm run check` e `npm test` antes de entregar.** Nenhuma alteração
    entra com erro de tipo ou teste quebrado. O CI também roda os dois.
12. **Nunca faça commit na branch `main`.** Trabalhe em branch própria.

## 0.3 Checklist de fim de tarefa

Antes de dizer que terminou:

- [ ] `npm run check` passa sem erro.
- [ ] `npm test` passa.
- [ ] Nenhum travessão nem caractere de seta no que eu escrevi
      (`LC_ALL=C.UTF-8 grep -rn "[—–→←⟶⇒↔⬅➜]" <arquivos alterados>`; sem o
      `LC_ALL` o grep compara bytes e acusa os traços de árvore de pastas).
- [ ] Strings novas estão nos dois dicionários do `i18n.ts`.
- [ ] Nenhuma cor hardcoded.
- [ ] Testei (no navegador ou mentalmente) em 360x640 e 640x360, sem scroll
      horizontal da página e sem carta cortada.
- [ ] Ação nova ou alterada tem teste em `shared/__tests__/engine.test.ts`.
- [ ] Documentos afetados desta pasta foram atualizados.
- [ ] Não criei componente ou hook duplicado do que já existia.
