# 11. Serviço de IA

## 11.1 Situação atual

**O projeto não usa nenhum serviço de IA.** Não há provedor, chave de API,
prompt, rota nem sistema de créditos. Este documento existe para manter a
estrutura padrão da pasta `docs/` e para registrar as regras caso um dia se
adicione algo assim.

## 11.2 Se um dia houver IA

Ideias que já apareceram como possibilidade: um jogador automático para
completar mesa, ou um explicador de regras de jogos conhecidos.

Regras para quem implementar:

1. **Nunca no cliente.** Chave de API não pode ir para o bundle do Vite (tudo
   com prefixo `VITE_` é público). A chamada sai do servidor em `server/`.
2. **Um bot é um jogador.** Ele entra na sala como qualquer outro e age
   enviando `Action` pelo motor, nunca escrevendo no estado diretamente.
3. **Um bot só vê o que um jogador veria.** Ele recebe `viewFor(state, botId)`,
   nunca o `RoomState` inteiro.
4. **Limite de custo.** Defina teto de chamadas por sala e por minuto, no
   mesmo espírito do limite de taxa do WebSocket.
5. Documente aqui o provedor, os modelos, os prompts, as variáveis de ambiente
   e os limites, e atualize [02-tecnologias.md](02-tecnologias.md).
