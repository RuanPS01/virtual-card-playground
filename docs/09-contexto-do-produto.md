# 9. Contexto do produto

## 9.1 O que é

Uma **mesa de cartas virtual livre**: um baralho comum de 52 cartas, uma área
compartilhada e a mão de cada jogador, sincronizados em tempo real entre
navegadores. Os jogadores combinam entre si o jogo (truco, buraco, pife, poker
de mesa, paciência a dois) e a mesa só garante que todos vejam a mesma coisa.

Publicado em https://ruanps.com.br/virtual-card-playground.

## 9.2 Para quem

Grupos de amigos que querem jogar cartas à distância, normalmente conversando
por voz em outro aplicativo. Boa parte acessa pelo **celular**, então o uso no
celular, em pé e deitado, é tão importante quanto no computador.

## 9.3 O que o produto faz

- Salas com código de 6 caracteres e link de convite, até 8 jogadores.
- Monte com comprar, embaralhar, adicionar baralho e remover cartas por valor
  ou naipe.
- Mesa livre: cartas abertas ou fechadas em qualquer posição, viradas com um
  toque, agrupadas em pilha ou leque.
- Mão privada, reordenável, com ordenação por valor ou naipe, e entrega de
  cartas para outro jogador.
- Arrasto visível para todos em tempo real.
- Volta automática para a sala depois de recarregar ou perder a conexão.
- Mesa com feltro verde ou vinho, como as mesas de jogo clássicas.
- Grupos em leque reordenáveis à mão, como a própria mão do jogador, ou
  ordenados automaticamente por valor ou por manilha.
- Grupos inteiros levados de uma vez para o monte, para uma mão ou para outro
  grupo.
- Adversários vistos como leques de cartas (padrão) ou como etiquetas, e uma barra
  ampliada para entregar cartas com precisão no celular.
- Remover um baralho inteiro do monte e reiniciar com um único baralho original.
- App instalável (PWA) no celular e no computador.
- Interface em português do Brasil e em inglês.
- Animações, efeitos e sons em todas as ações.

## 9.4 O que o produto NÃO é

- **Não aplica regras.** Não há turnos, pontuação nem validação de jogada.
  Qualquer jogador pode mexer em qualquer carta da mesa e do monte. Isso é
  intencional: a mesa serve para qualquer jogo.
- **Não tem conta nem login.** O jogador é um nome e um assento na sala.
- **Não guarda histórico.** Uma sala existe enquanto há gente nela.
- **Não é uma recriação de nenhum jogo comercial.** O visual tem a energia de
  jogos de cartas com muito feedback, mas arte, cores e sons são próprios.

## 9.5 Princípios de decisão

1. **O que um vê, todos veem.** Consistência entre jogadores vem antes de
   qualquer outra coisa. Se uma melhoria arrisca dessincronizar a mesa, ela
   não entra.
2. **Celular é cidadão de primeira classe.**
3. **Toda ação responde.** Feedback visual e sonoro imediato.
4. **Simples de publicar.** Funciona só com hospedagem estática (Firebase); o
   servidor WebSocket é uma melhoria recomendada, não um requisito.
