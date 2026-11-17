// Preferência de cada jogador guardada no navegador (cor da mesa, visão dos
// adversários). Fica em localStorage, e não na sala: muda só a tela de quem
// escolheu. Um componente que lê o valor renderiza de novo quando ele muda.

import { useSyncExternalStore } from 'react';

export interface Preference<T extends string> {
  readonly values: readonly T[];
  get(): T;
  set(value: T): void;
  /** Hook: devolve o valor atual e acompanha as mudanças. */
  useValue(): T;
}

export const createPreference = <T extends string>(
  key: string,
  values: readonly T[],
  fallback: T,
  /** Efeito colateral a cada valor (inclusive o inicial), como trocar um atributo do <html>. */
  apply?: (value: T) => void,
): Preference<T> => {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return values.includes(raw as T) ? (raw as T) : fallback;
    } catch {
      // Navegação privada pode bloquear o storage: vale o padrão.
      return fallback;
    }
  };

  let current = read();
  const listeners = new Set<() => void>();
  apply?.(current);

  const get = () => current;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    values,
    get,
    set: (value) => {
      if (value === current) return;
      current = value;
      apply?.(value);
      try {
        localStorage.setItem(key, value);
      } catch {
        // Sem storage a escolha vale só até recarregar.
      }
      listeners.forEach((listener) => listener());
    },
    useValue: () => useSyncExternalStore(subscribe, get),
  };
};
