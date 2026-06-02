// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; 
import App from './App.jsx';

import { AlertProvider } from './components/AlertContext/AlertContext.jsx';
// 🟢 IMPORTAR O NOVO CONTEXTO DE CARGAS
import { CargasProvider } from './components/context/CargasContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AlertProvider>
      {/* 🟢 ENVOLVER O APP COM O PROVEDOR DE CARGAS */}
      <CargasProvider>
        <App />
      </CargasProvider>
    </AlertProvider>
  </StrictMode>,
);