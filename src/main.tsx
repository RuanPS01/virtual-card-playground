import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// O CSS vem antes do App: os módulos importados pelo App (cor da mesa,
// textura do feltro) leem tokens de index.css ao serem avaliados.
import './index.css';
// Fonte empacotada junto com o app: nada é buscado em CDN de fontes.
import '@fontsource/jersey-15/400.css';
// Aplica a cor da mesa escolhida antes do primeiro render, sem piscar o verde.
import '@/lib/felt';
// Cedo de propósito: o aviso de "pode instalar" pode chegar antes do React montar.
import { registerPwa } from '@/lib/pwa';
import App from './App.tsx';

void registerPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
