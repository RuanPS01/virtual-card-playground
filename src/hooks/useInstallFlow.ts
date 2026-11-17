// Estado e ação de instalar o app, para o menu da mesa e a tela de entrada.
// Onde o navegador oferece o pedido de instalação, ele abre direto; onde não
// oferece, abre o InstallDialog com o passo a passo.

import { useState } from 'react';
import { promptInstall, useInstallState } from '@/lib/pwa';

export const useInstallFlow = () => {
  const state = useInstallState();
  const [helpOpen, setHelpOpen] = useState(false);
  const install = async () => {
    if (!(await promptInstall())) setHelpOpen(true);
  };
  return { installed: state.installed, method: state.method, install, helpOpen, setHelpOpen };
};
