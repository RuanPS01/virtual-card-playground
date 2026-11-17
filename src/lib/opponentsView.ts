// Como os adversários aparecem no topo da mesa: mini leques com o verso das
// cartas de cada um (padrão) ou etiquetas compactas. Preferência de cada
// jogador; não muda a tela dos outros.

import { createPreference } from './preference';

export type OpponentsView = 'fans' | 'badges';
/** A ordem é a do menu: o padrão vem primeiro. */
export const OPPONENT_VIEWS: readonly OpponentsView[] = ['fans', 'badges'];

const opponentsView = createPreference<OpponentsView>('vcp.opponents', OPPONENT_VIEWS, 'fans');

export const setOpponentsView = opponentsView.set;
export const useOpponentsView = opponentsView.useValue;
