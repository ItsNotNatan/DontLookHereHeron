// src/routes.jsx
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Layout from './componentes/layout/layout'; 
import Login from './pages/Login/Login';

import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import EditorProjetos from './pages/EditorProjetos/EditorProjetos';
import EditorMotivos from './pages/EditorMotivos/EditorMotivos';
import EditorUsuarios from './pages/EditorUsuarios/EditorUsuarios';
import EditorVeiculos from './pages/EditorVeiculos/EditorVeiculos';
import EditorEndereco from './pages/EditorEndereco/EditorEndereco';
import EditorTransportadoras from './pages/EditorTransportadoras/EditorTransportadoras';

const RotaPrivada = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RotaProtegida = ({ children, perfisPermitidos }) => {
  const perfilAtual = localStorage.getItem('perfil') || 'Operador';
  if (!perfisPermitidos.includes(perfilAtual)) {
    alert(`Acesso Negado: Seu perfil (${perfilAtual}) não tem permissão para acessar esta área.`);
    return <Navigate to="/" replace />;
  }
  return children;
};

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },

  {
    path: "/",
    element: (
      <RotaPrivada>
        <Layout />
      </RotaPrivada>
    ), 
    children: [
      { 
        path: "/", 
        element: <RotaProtegida perfisPermitidos={['Admin', 'Operador']}><AdminDashboard /></RotaProtegida> 
      },
      // 🟢 Daqui pra baixo, TUDO é restrito apenas ao Admin!
      { 
        path: "/editor-projetos", 
        element: <RotaProtegida perfisPermitidos={['Admin']}><EditorProjetos /></RotaProtegida> 
      },
      { 
        path: "/editor-motivos", 
        element: <RotaProtegida perfisPermitidos={['Admin']}><EditorMotivos /></RotaProtegida> 
      },
      { 
        path: "/editor-enderecos", 
        element: <RotaProtegida perfisPermitidos={['Admin']}><EditorEndereco /></RotaProtegida> 
      },
      { 
        path: "/editor-transportadoras", 
        element: <RotaProtegida perfisPermitidos={['Admin']}><EditorTransportadoras /></RotaProtegida> 
      },      
      { 
        path: "/gestao-usuarios", 
        element: <RotaProtegida perfisPermitidos={['Admin']}><EditorUsuarios /></RotaProtegida> 
      },
      { 
        path: "/gestao-veiculos", 
        element: <RotaProtegida perfisPermitidos={['Admin']}><EditorVeiculos /></RotaProtegida> 
      }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);
