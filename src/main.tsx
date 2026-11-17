import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonte empacotada junto com o app: nada é buscado em CDN de fontes.
import '@fontsource/jersey-15/400.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
