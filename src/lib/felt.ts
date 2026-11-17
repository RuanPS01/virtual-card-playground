// Cor do feltro da mesa: verde ou vinho, como as mesas de jogo clássicas.
// É preferência de cada jogador (fica no navegador), e não da sala: cada um
// escolhe a mesa que acha mais confortável, sem mudar a dos outros.

import { useSyncExternalStore } from 'react';
import { tokenColor } from './tokens';

export type Felt = 'green' | 'wine';
export const FELTS: readonly Felt[] = ['green', 'wine'];

const FELT_KEY = 'vcp.felt';

const read = (): Felt => {
  try {
    return localStorage.getItem(FELT_KEY) === 'wine' ? 'wine' : 'green';
  } catch {
    return 'green';
  }
};

let current: Felt = read();
const listeners = new Set<() => void>();

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

apply(current);

export const getFelt = (): Felt => current;

export const setFelt = (felt: Felt): void => {
  if (felt === current) return;
  current = felt;
  apply(felt);
  try {
    localStorage.setItem(FELT_KEY, felt);
  } catch {
    // Sem storage a escolha vale só até recarregar.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useFelt = (): Felt => useSyncExternalStore(subscribe, getFelt);
