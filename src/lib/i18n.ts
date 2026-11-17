// Todas as strings visíveis da interface vivem aqui, nos dois dicionários.
// O tipo de `en` é derivado de `ptBR`: esquecer uma chave em um deles é erro
// de compilação, e não um texto faltando em produção.

import { useSyncExternalStore } from 'react';

const ptBR = {
  'app.title': 'Mesa de Cartas Virtual',

  'lobby.subtitle': 'Uma mesa livre para jogar cartas com os amigos, em tempo real.',
  'lobby.name': 'Seu nome',
  'lobby.namePlaceholder': 'Digite seu nome',
  'lobby.code': 'Código da sala',
  'lobby.codePlaceholder': 'Ex.: K7M2QX',
  'lobby.create': 'Criar nova sala',
  'lobby.join': 'Entrar em uma sala',
  'lobby.submitCreate': 'Criar sala',
  'lobby.submitJoin': 'Entrar na sala',
  'lobby.back': 'Voltar',
  'lobby.hint': 'Convide seus amigos compartilhando o código ou o link da sala.',
  'lobby.needName': 'Digite seu nome para continuar.',
  'lobby.needCode': 'Digite o código da sala.',
  'lobby.connecting': 'Conectando...',
  'lobby.resuming': 'Voltando para a sala {room}...',
  'lobby.modeWs': 'Tempo real: servidor WebSocket',
  'lobby.modeFirebase': 'Tempo real: Firebase',
  'lobby.language': 'Idioma',

  'toast.roomCreated': 'Sala {room} criada. Convide seus amigos!',
  'toast.roomJoined': 'Você entrou na sala {room}.',
  'toast.left': 'Você saiu da sala.',
  'toast.linkCopied': 'Link de convite copiado.',
  'toast.copyFailed': 'Não foi possível copiar. O código da sala é {room}.',
  'toast.playerJoined': '{name} entrou na sala.',
  'toast.playerLeft': '{name} saiu da sala.',
  'toast.playerDropped': '{name} perdeu a conexão.',
  'toast.playerBack': '{name} voltou.',
  'toast.reconnected': 'Conexão restabelecida.',
  'toast.closed.left': 'Você saiu da sala.',
  'toast.closed.removed': 'Você foi removido da sala.',
  'toast.closed.replaced': 'Esta sala foi aberta em outra aba.',
  'toast.closed.room_gone': 'A sala não existe mais.',
  'toast.removed': '{count} cartas removidas do monte.',
  'toast.deckRemoved': 'Um baralho saiu do monte ({count} cartas).',
  'toast.deckRemovedPartial': '{count} cartas saíram do monte. {skipped} ficaram porque as cópias extras estão na mesa ou nas mãos.',

  'error.bad_action': 'Essa ação não é possível agora.',
  'error.not_in_room': 'Você não está nesta sala.',
  'error.card_not_found': 'Essa carta não está mais ali.',
  'error.not_your_card': 'Essa carta está na mão de outro jogador.',
  'error.deck_empty': 'O monte está vazio.',
  'error.single_deck': 'Só há um baralho na mesa: não há baralho para remover.',
  'error.deck_incomplete': 'As cópias extras estão na mesa ou nas mãos. Devolva-as ao monte ou reinicie o jogo antes de remover um baralho.',
  'error.pile_not_found': 'Esse grupo não existe mais.',
  'error.player_not_found': 'Jogador não encontrado.',
  'error.player_connected': 'Só é possível remover quem está desconectado.',
  'error.room_not_found': 'Sala não encontrada. Confira o código.',
  'error.room_full': 'A sala está cheia.',
  'error.bad_session': 'Sua sessão nesta sala expirou.',
  'error.offline': 'Sem conexão com a sala. Tentando reconectar.',
  'error.timeout': 'A sala demorou para responder. Tente de novo.',
  'error.rate_limited': 'Muitas ações em sequência. Aguarde um instante.',

  'hud.room': 'Sala',
  'hud.copyInvite': 'Copiar link de convite',
  'hud.reconnecting': 'Reconectando...',
  'hud.menu': 'Menu',
  'hud.alone': 'Aguardando outros jogadores',

  'menu.addDeck': 'Adicionar baralho',
  'menu.removeDeck': 'Remover um baralho',
  'menu.removeCards': 'Remover cartas do monte',
  'menu.resetOriginal': 'Reiniciar com um baralho original',
  'menu.reset': 'Reiniciar jogo',
  'menu.felt': 'Cor da mesa',
  'menu.opponents': 'Adversários',
  'menu.soundOn': 'Som: ligado',
  'menu.soundOff': 'Som: desligado',
  'menu.help': 'Como jogar',
  'menu.install': 'Instalar app',
  'pwa.installed': 'App instalado. Ele já está na sua tela inicial.',
  'pwa.update': 'Há uma versão nova da mesa.',
  'pwa.updateNow': 'Atualizar',
  'install.title': 'Instalar o app',
  'install.benefits': 'Instalado, o jogo abre pelo ícone, em tela cheia e sem a barra do navegador.',
  'install.ios.1': 'No Safari, toque no botão Compartilhar (o quadrado com uma seta para cima).',
  'install.ios.2': 'Role a lista e escolha Adicionar à Tela de Início.',
  'install.ios.3': 'Toque em Adicionar. O app aparece na tela inicial.',
  'install.manual.1': 'Este navegador não oferece a instalação direto pela página. Abra o menu do navegador e procure Instalar app ou Adicionar à tela inicial.',
  'install.manual.2': 'No Chrome e no Edge do computador, também há um botão de instalar na barra de endereço. No Safari do Mac, use Arquivo e depois Adicionar ao Dock.',
  'menu.leave': 'Sair da sala',

  'hand.title': 'Sua mão',
  'hand.empty': 'Mão vazia. Toque no monte para comprar.',
  'hand.sort': 'Ordenar',
  'hand.sortRank': 'Valor',
  'hand.sortSuit': 'Naipe',
  'hand.faceUp': 'Aberta',
  'hand.faceDown': 'Fechada',
  'hand.faceHint': 'Define se as cartas chegam à mesa abertas ou fechadas',

  'felt.green': 'Verde',
  'felt.wine': 'Vinho',
  'opponents.badges': 'Etiquetas',
  'opponents.fans': 'Leques de cartas',
  'reach.title': 'Entregar para',
  'reach.titleTo': 'Entregar para {name}',

  'deck.shuffle': 'Embaralhar',
  'deck.empty': 'Vazio',
  'deck.label': 'Monte',

  'table.empty': 'Arraste cartas para a mesa',

  'pile.toFan': 'Abrir o grupo em leque',
  'pile.toStack': 'Juntar o grupo em pilha',

  'player.you': 'Você',
  'player.offline': 'desconectado',
  'player.remove': 'Remover {name}',
  'player.holding': '{name} está movendo',

  'confirm.addDeck.title': 'Adicionar baralho',
  'confirm.addDeck.text': 'Um baralho completo de 52 cartas entra no monte, que é embaralhado em seguida.',
  'confirm.addDeck.ok': 'Adicionar',
  'confirm.reset.title': 'Reiniciar jogo',
  'confirm.reset.text': 'Todas as cartas da mesa e das mãos voltam para o monte.',
  'confirm.reset.ok': 'Reiniciar',
  'confirm.removeDeck.title': 'Remover um baralho',
  'confirm.removeDeck.text': 'Uma cópia de cada carta sai do monte. Cartas que só têm uma cópia ficam, então a mesa mantém pelo menos um baralho.',
  'confirm.removeDeck.ok': 'Remover',
  'confirm.resetOriginal.title': 'Reiniciar com um baralho original',
  'confirm.resetOriginal.text': 'Todas as cartas saem da mesa e das mãos, e o monte volta a ser um único baralho de 52 cartas, embaralhado. Cartas removidas voltam e baralhos extras saem.',
  'confirm.resetOriginal.ok': 'Reiniciar',
  'confirm.leave.title': 'Sair da sala',
  'confirm.leave.text': 'As cartas da sua mão voltam para o monte.',
  'confirm.leave.ok': 'Sair',
  'confirm.removePlayer.title': 'Remover {name}',
  'confirm.removePlayer.text': 'As cartas da mão desse jogador voltam para o monte.',
  'confirm.removePlayer.ok': 'Remover',

  'common.cancel': 'Cancelar',
  'common.close': 'Fechar',

  'remove.title': 'Remover cartas do monte',
  'remove.byRank': 'Por valor',
  'remove.bySuit': 'Por naipe',
  'remove.submit': 'Remover',

  'suit.hearts': 'Copas',
  'suit.diamonds': 'Ouros',
  'suit.clubs': 'Paus',
  'suit.spades': 'Espadas',
  'rank.A': 'Ás',
  'rank.J': 'Valete',
  'rank.Q': 'Dama',
  'rank.K': 'Rei',

  'help.title': 'Como jogar',
  'help.draw': 'Toque no monte para comprar uma carta.',
  'help.drag': 'Arraste cartas entre o monte, a mesa, sua mão e os outros jogadores.',
  'help.flip': 'Toque em uma carta da mesa para virar.',
  'help.group': 'Solte uma carta em cima de outra para formar um grupo. Toque na etiqueta do grupo para alternar entre pilha e leque, ou arraste a etiqueta para mover tudo.',
  'help.reorder': 'Arraste as cartas da mão para reordenar, ou use os botões de ordenar.',
  'help.face': 'O seletor Aberta/Fechada define como as cartas chegam à mesa.',
  'help.pileOrder': 'Com o grupo em leque, arraste uma carta para outra posição para reordenar, como na sua mão.',
  'help.give': 'Leve uma carta até o topo da tela: a barra de jogadores cresce, e soltar sobre um jogador entrega a carta a ele.',
  'help.opponents': 'No menu, em Adversários, escolha ver os outros jogadores como leques de cartas ou como etiquetas.',
  'help.return': 'Solte uma carta sobre o monte para devolver.',

  'notFound.title': 'Página não encontrada',
  'notFound.text': 'Este endereço não existe.',
  'notFound.back': 'Voltar para o início',
} as const;

export type MessageKey = keyof typeof ptBR;

const en: Record<MessageKey, string> = {
  'app.title': 'Virtual Card Table',

  'lobby.subtitle': 'An open table to play cards with friends, in real time.',
  'lobby.name': 'Your name',
  'lobby.namePlaceholder': 'Type your name',
  'lobby.code': 'Room code',
  'lobby.codePlaceholder': 'E.g. K7M2QX',
  'lobby.create': 'Create a new room',
  'lobby.join': 'Join a room',
  'lobby.submitCreate': 'Create room',
  'lobby.submitJoin': 'Join room',
  'lobby.back': 'Back',
  'lobby.hint': 'Invite your friends by sharing the room code or link.',
  'lobby.needName': 'Type your name to continue.',
  'lobby.needCode': 'Type the room code.',
  'lobby.connecting': 'Connecting...',
  'lobby.resuming': 'Returning to room {room}...',
  'lobby.modeWs': 'Real time: WebSocket server',
  'lobby.modeFirebase': 'Real time: Firebase',
  'lobby.language': 'Language',

  'toast.roomCreated': 'Room {room} created. Invite your friends!',
  'toast.roomJoined': 'You joined room {room}.',
  'toast.left': 'You left the room.',
  'toast.linkCopied': 'Invite link copied.',
  'toast.copyFailed': 'Could not copy. The room code is {room}.',
  'toast.playerJoined': '{name} joined the room.',
  'toast.playerLeft': '{name} left the room.',
  'toast.playerDropped': '{name} lost connection.',
  'toast.playerBack': '{name} is back.',
  'toast.reconnected': 'Connection restored.',
  'toast.closed.left': 'You left the room.',
  'toast.closed.removed': 'You were removed from the room.',
  'toast.closed.replaced': 'This room was opened in another tab.',
  'toast.closed.room_gone': 'The room no longer exists.',
  'toast.removed': '{count} cards removed from the deck.',
  'toast.deckRemoved': 'One deck left the draw pile ({count} cards).',
  'toast.deckRemovedPartial': '{count} cards left the draw pile. {skipped} stayed because the extra copies are on the table or in hands.',

  'error.bad_action': 'That action is not possible right now.',
  'error.not_in_room': 'You are not in this room.',
  'error.card_not_found': 'That card is no longer there.',
  'error.not_your_card': "That card is in another player's hand.",
  'error.deck_empty': 'The deck is empty.',
  'error.single_deck': 'There is only one deck on the table: no deck to remove.',
  'error.deck_incomplete': 'The extra copies are on the table or in hands. Return them to the draw pile or restart the game before removing a deck.',
  'error.pile_not_found': 'That group no longer exists.',
  'error.player_not_found': 'Player not found.',
  'error.player_connected': 'Only disconnected players can be removed.',
  'error.room_not_found': 'Room not found. Check the code.',
  'error.room_full': 'The room is full.',
  'error.bad_session': 'Your session in this room has expired.',
  'error.offline': 'No connection to the room. Trying to reconnect.',
  'error.timeout': 'The room took too long to answer. Try again.',
  'error.rate_limited': 'Too many actions in a row. Wait a moment.',

  'hud.room': 'Room',
  'hud.copyInvite': 'Copy invite link',
  'hud.reconnecting': 'Reconnecting...',
  'hud.menu': 'Menu',
  'hud.alone': 'Waiting for other players',

  'menu.addDeck': 'Add a deck',
  'menu.removeDeck': 'Remove a deck',
  'menu.removeCards': 'Remove cards from the deck',
  'menu.resetOriginal': 'Restart with one original deck',
  'menu.reset': 'Restart game',
  'menu.felt': 'Table color',
  'menu.opponents': 'Opponents',
  'menu.soundOn': 'Sound: on',
  'menu.soundOff': 'Sound: off',
  'menu.help': 'How to play',
  'menu.install': 'Install app',
  'pwa.installed': 'App installed. It is on your home screen now.',
  'pwa.update': 'A new version of the table is available.',
  'pwa.updateNow': 'Update',
  'install.title': 'Install the app',
  'install.benefits': 'Installed, the game opens from its icon, full screen and without the browser bar.',
  'install.ios.1': 'In Safari, tap the Share button (the square with an arrow pointing up).',
  'install.ios.2': 'Scroll the list and choose Add to Home Screen.',
  'install.ios.3': 'Tap Add. The app shows up on your home screen.',
  'install.manual.1': 'This browser does not offer installing straight from the page. Open the browser menu and look for Install app or Add to home screen.',
  'install.manual.2': 'In Chrome and Edge on a computer there is also an install button in the address bar. In Safari on a Mac, use File and then Add to Dock.',
  'menu.leave': 'Leave room',

  'hand.title': 'Your hand',
  'hand.empty': 'Empty hand. Tap the deck to draw.',
  'hand.sort': 'Sort',
  'hand.sortRank': 'Rank',
  'hand.sortSuit': 'Suit',
  'hand.faceUp': 'Face up',
  'hand.faceDown': 'Face down',
  'hand.faceHint': 'Sets whether cards land on the table face up or face down',

  'felt.green': 'Green',
  'felt.wine': 'Wine',
  'opponents.badges': 'Tags',
  'opponents.fans': 'Card fans',
  'reach.title': 'Give to',
  'reach.titleTo': 'Give to {name}',

  'deck.shuffle': 'Shuffle',
  'deck.empty': 'Empty',
  'deck.label': 'Deck',

  'table.empty': 'Drag cards onto the table',

  'pile.toFan': 'Spread the group as a fan',
  'pile.toStack': 'Gather the group into a stack',

  'player.you': 'You',
  'player.offline': 'disconnected',
  'player.remove': 'Remove {name}',
  'player.holding': '{name} is moving',

  'confirm.addDeck.title': 'Add a deck',
  'confirm.addDeck.text': 'A full 52 card deck goes into the draw pile, which is then shuffled.',
  'confirm.addDeck.ok': 'Add',
  'confirm.reset.title': 'Restart game',
  'confirm.reset.text': 'Every card on the table and in the hands returns to the deck.',
  'confirm.reset.ok': 'Restart',
  'confirm.removeDeck.title': 'Remove a deck',
  'confirm.removeDeck.text': 'One copy of each card leaves the draw pile. Cards with a single copy stay, so the table always keeps at least one deck.',
  'confirm.removeDeck.ok': 'Remove',
  'confirm.resetOriginal.title': 'Restart with one original deck',
  'confirm.resetOriginal.text': 'Every card leaves the table and the hands, and the draw pile becomes a single shuffled 52 card deck again. Removed cards come back and extra decks leave.',
  'confirm.resetOriginal.ok': 'Restart',
  'confirm.leave.title': 'Leave room',
  'confirm.leave.text': 'The cards in your hand return to the deck.',
  'confirm.leave.ok': 'Leave',
  'confirm.removePlayer.title': 'Remove {name}',
  'confirm.removePlayer.text': "The cards in that player's hand return to the deck.",
  'confirm.removePlayer.ok': 'Remove',

  'common.cancel': 'Cancel',
  'common.close': 'Close',

  'remove.title': 'Remove cards from the deck',
  'remove.byRank': 'By rank',
  'remove.bySuit': 'By suit',
  'remove.submit': 'Remove',

  'suit.hearts': 'Hearts',
  'suit.diamonds': 'Diamonds',
  'suit.clubs': 'Clubs',
  'suit.spades': 'Spades',
  'rank.A': 'Ace',
  'rank.J': 'Jack',
  'rank.Q': 'Queen',
  'rank.K': 'King',

  'help.title': 'How to play',
  'help.draw': 'Tap the deck to draw a card.',
  'help.drag': 'Drag cards between the deck, the table, your hand and the other players.',
  'help.flip': 'Tap a card on the table to flip it.',
  'help.group': 'Drop a card on top of another to form a group. Tap the group tag to switch between stack and fan, or drag the tag to move everything.',
  'help.reorder': 'Drag the cards in your hand to reorder them, or use the sort buttons.',
  'help.face': 'The Face up/Face down switch sets how cards land on the table.',
  'help.pileOrder': 'With the group spread as a fan, drag a card to another position to reorder it, like in your hand.',
  'help.give': 'Bring a card to the top of the screen: the player bar grows, and dropping on a player hands the card to them.',
  'help.opponents': 'In the menu, under Opponents, choose to see the other players as card fans or as tags.',
  'help.return': 'Drop a card on the deck to return it.',

  'notFound.title': 'Page not found',
  'notFound.text': 'This address does not exist.',
  'notFound.back': 'Back to the start',
};

const dictionaries = { 'pt-BR': ptBR, en } as const;

export type Locale = keyof typeof dictionaries;
export const LOCALES: readonly Locale[] = ['pt-BR', 'en'];

const LOCALE_KEY = 'vcp.locale';

const readLocale = (): Locale => {
  try {
    return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'pt-BR';
  } catch {
    return 'pt-BR';
  }
};

let current: Locale = readLocale();
const listeners = new Set<() => void>();

export const getLocale = (): Locale => current;

export const setLocale = (locale: Locale): void => {
  current = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Sem storage a escolha vale só até recarregar.
  }
  listeners.forEach((listener) => listener());
};

export type Vars = Record<string, string | number>;

export const t = (key: MessageKey, vars?: Vars): string => {
  let text: string = dictionaries[current][key] ?? ptBR[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value));
  }
  return text;
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Devolve `t` e faz o componente renderizar de novo quando o idioma muda. */
export const useT = (): typeof t => {
  useSyncExternalStore(subscribe, getLocale);
  return t;
};
