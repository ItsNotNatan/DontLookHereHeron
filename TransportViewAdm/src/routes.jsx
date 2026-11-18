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

// Nova aba Controle de SLA
import ControleSLA from './pages/ControleSLA/ControleSLA'; 

// 👇 NOVA ABA: Auditoria de Seguros
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

// Configuração do Router (exportado com o nome exato que o App.jsx espera)
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
    path: "/auditoriaseguros", // 👇 NOVA ROTA ADICIONADA AQUI
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <AuditoriaSeguros />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/projetos",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorProjetos />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/transportadoras",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorTransportadoras />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/enderecos",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorEndereco />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/motivos",
    element: (
      <RotaPrivada>
        <RotaProtegida perfisPermitidos={['Admin', 'Operador']}>
          <EditorMotivos />
        </RotaProtegida>
      </RotaPrivada>
    )
  },
  {
    path: "/usuarios",
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
