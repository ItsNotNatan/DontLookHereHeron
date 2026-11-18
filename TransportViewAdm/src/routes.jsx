import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importação das páginas existentes
import Login from './pages/Login/login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import EditorProjetos from './pages/EditorProjetos/EditorProjetos';
import EditorEndereco from './pages/EditorEndereco/EditorEndereco';
import EditorTransportadoras from './pages/EditorTransportadoras/EditorTransportadoras';
import EditorMotivos from './pages/EditorMotivos/EditorMotivos';
import EditorUsuarios from './pages/EditorUsuarios/EditorUsuarios';
import EditorVeiculos from './pages/EditorVeiculos/EditorVeiculos';

// ✅ NOVA ABA IMPORTADA AQUI
import ControleSLA from './pages/ControleSLA/ControleSLA'; 

import Layout from './componentes/layout/layout';

// Simulação dos seus componentes de proteção de rota (que já devem existir no seu arquivo)
const RotaPrivada = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const RotaProtegida = ({ children, perfisPermitidos }) => {
  const perfil = localStorage.getItem('perfil');
  return perfisPermitidos.includes(perfil) ? children : <Navigate to="/" />;
};

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rotas Privadas (Com Layout e Navbar) */}
        <Route path="/" element={<RotaPrivada><AdminDashboard /></RotaPrivada>} />
        
        {/* ✅ ROTA DO CONTROLE DE SLA ADICIONADA AQUI */}
        <Route 
          path="/controlesla" 
          element={
            <RotaPrivada>
              <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
                <ControleSLA />
              </RotaProtegida>
            </RotaPrivada>
          } 
        />

        {/* Demais rotas do sistema */}
        <Route path="/projetos" element={<RotaPrivada><RotaProtegida perfisPermitidos={['Admin', 'Operador']}><EditorProjetos /></RotaProtegida></RotaPrivada>} />
        <Route path="/transportadoras" element={<RotaPrivada><RotaProtegida perfisPermitidos={['Admin', 'Operador']}><EditorTransportadoras /></RotaProtegida></RotaPrivada>} />
        <Route path="/enderecos" element={<RotaPrivada><RotaProtegida perfisPermitidos={['Admin', 'Operador']}><EditorEndereco /></RotaProtegida></RotaPrivada>} />
        <Route path="/motivos" element={<RotaPrivada><RotaProtegida perfisPermitidos={['Admin', 'Operador']}><EditorMotivos /></RotaProtegida></RotaPrivada>} />
        
        {/* Rotas exclusivas de Admin */}
        <Route path="/usuarios" element={<RotaPrivada><RotaProtegida perfisPermitidos={['Admin']}><EditorUsuarios /></RotaProtegida></RotaPrivada>} />
        <Route path="/veiculos" element={<RotaPrivada><RotaProtegida perfisPermitidos={['Admin']}><EditorVeiculos /></RotaProtegida></RotaPrivada>} />
      </Routes>
    </BrowserRouter>
  );
}
