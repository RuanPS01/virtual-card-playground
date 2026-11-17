// PWA: registro do service worker e instalação do app.
//
// Instalar: Chrome, Edge e Android avisam que o app pode ser instalado pelo
// evento beforeinstallprompt. Ele é guardado aqui para o menu oferecer
// "Instalar app" na hora que o jogador quiser. O iPhone (Safari) não tem esse
// evento: lá a instalação é pelo botão Compartilhar, e o menu mostra o passo
// a passo. Este módulo é importado no main.tsx porque o evento pode chegar
// antes de qualquer componente montar.

import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { t } from './i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMethod = 'prompt' | 'ios' | 'manual';

export interface InstallState {
  /** O app já está aberto como app instalado: não há o que oferecer. */
  installed: boolean;
  method: InstallMethod;
}

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPad com iPadOS se apresenta como Mac, mas tem tela de toque.
const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const compute = (): InstallState => ({
  installed: isStandalone(),
  method: deferred ? 'prompt' : isIos() ? 'ios' : 'manual',
});

// O snapshot só muda de identidade quando algo muda: o useSyncExternalStore
// renderiza de novo a cada objeto novo.
let snapshot = compute();
const emit = () => {
  snapshot = compute();
  listeners.forEach((listener) => listener());
};

window.addEventListener('beforeinstallprompt', (event) => {
  // Sem o preventDefault o Chrome do Android mostra a própria faixa de
  // instalação por cima da mesa, no meio do jogo. A opção fica no menu.
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  emit();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  emit();
  toast.success(t('pwa.installed'));
});

window.matchMedia('(display-mode: standalone)').addEventListener?.('change', emit);

/** Abre o pedido de instalação do navegador. Devolve false quando não há um. */
export const promptInstall = async (): Promise<boolean> => {
  const event = deferred;
  if (!event) return false;
  // O evento só pode ser usado uma vez.
  deferred = null;
  emit();
  await event.prompt();
  await event.userChoice.catch(() => undefined);
  return true;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useInstallState = (): InstallState => useSyncExternalStore(subscribe, () => snapshot);

/**
 * Registra o service worker (só no build de produção: no desenvolvimento ele
 * guardaria arquivos velhos e atrapalharia a recarga do Vite). Quando sai uma
 * versão nova, pergunta antes de recarregar, para não interromper uma jogada.
 */
export const registerPwa = async (): Promise<void> => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const { registerSW } = await import('virtual:pwa-register');
  const update = registerSW({
    onNeedRefresh: () => {
      toast.message(t('pwa.update'), {
        duration: Infinity,
        action: { label: t('pwa.updateNow'), onClick: () => void update(true) },
      });
    },
  });
};
