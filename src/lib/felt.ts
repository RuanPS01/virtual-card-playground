// Cor do feltro da mesa: verde ou vinho, como as mesas de jogo clássicas.
// É preferência de cada jogador, e não da sala: cada um escolhe a mesa que
// acha mais confortável, sem mudar a dos outros.

import { createPreference } from './preference';
import { tokenColor } from './tokens';

export type Felt = 'green' | 'wine';
export const FELTS: readonly Felt[] = ['green', 'wine'];

/**
 * As cores do feltro são tokens trocados pelo atributo data-felt em <html>
 * (ver index.css). A barra do navegador no celular acompanha a cor da borda
 * da mesa para a tela parecer uma peça só.
 */
const apply = (felt: Felt): void => {
  document.documentElement.dataset.felt = felt;
  // No próximo quadro o CSS já está aplicado. Ler o token antes disso
  // devolveria vazio no modo de desenvolvimento, que injeta o CSS por JS.
  requestAnimationFrame(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokenColor('--felt-dark'));
  });
};

const felt = createPreference<Felt>('vcp.felt', FELTS, 'green', apply);

export const getFelt = felt.get;
export const setFelt = felt.set;
export const useFelt = felt.useValue;
