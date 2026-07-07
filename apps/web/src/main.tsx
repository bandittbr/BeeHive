import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootstrapApp } from './app/bootstrap';

import './styles/tokens.css';
import './styles/global.css';
import './components/ui/ui.css';

// Inicia o Kernel e carrega os módulos do BeeHive antes da interface. O
// carregamento é assíncrono e não bloqueia a renderização.
void bootstrapApp();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento #root não encontrado no index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
