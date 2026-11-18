import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Importação das páginas existentes
import Login from './pages/Login/login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import EditorProjetos from './pages/EditorProjetos/EditorProjetos';
import EditorEndereco from './pages/EditorEndereco/EditorEndereco';
import EditorTransportadoras from './pages/EditorTransportadoras/EditorTransportadoras';
import EditorMotivos from './pages/EditorMotivos/EditorMotivos';
import EditorUsuarios from './pages/EditorUsuarios/EditorUsuarios';
import EditorVeiculos from './pages/EditorVeiculos/EditorVeiculos';

// Novas abas
import ControleSLA from './pages/ControleSLA/ControleSLA'; 
import AuditoriaSeguros from './pages/AuditoriaSeguros/AuditoriaSeguros';

import Layout from './componentes/layout/layout';

// Componentes de proteção
const RotaPrivada = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const RotaProtegida = ({ children, perfisPermitidos }) => {
  const perfil = localStorage.getItem('perfil');
  return perfisPermitidos.includes(perfil) ? children : <Navigate to="/" />;
};

// Configuração do Router
export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/",
    element: <RotaPrivada><AdminDashboard /></RotaPrivada>
  },
  {
    path: "/controlesla",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <ControleSLA />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/auditoriaseguros",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <AuditoriaSeguros />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/editor-projetos",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorProjetos />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/editor-transportadoras",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorTransportadoras />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/editor-enderecos",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorEndereco />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/editor-motivos",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorMotivos />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/gestao-usuarios",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin']}>
          <EditorUsuarios />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/veiculos",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin']}>
          <EditorVeiculos />
        </RotaProtegida>
      </RotaPrivada>
    )
  }
]);
