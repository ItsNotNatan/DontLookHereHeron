import React from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import logoComau from '../../assets/logo-comau.png';
import './layout.css';

export default function Layout() {
  const location = useLocation(); // Identifica em que rota o usuário está
  
  const isHome = location.pathname === '/'; // Verifica se é a página inicial
  
  // 1️⃣ NOVA LINHA: Identifica se estamos na página do simulador de cargas
  const isSimulador = location.pathname === '/simulador-veiculo';

  // 2️⃣ NOVA LINHA: Agrupamos a regra. Se for Home OU Simulador, a tela não terá padding (espaçamento lateral/topo)
  const isTelaCheia = isHome || isSimulador;

  return (
    <div className="app-layout">

      {/* O Cabeçalho só aparece se NÃO estivermos na Home */}
      {!isHome && (
        <header className="app-header">
          {/* LADO ESQUERDO: LOGO COMAU */}
          <Link to="/" className="logo-container">
            <img src={logoComau} alt="Comau" className="logo-img" />
            <span className="logo-text">ATM<span className="text-primary">Log</span></span>
            <span className="badge-role">Público</span>
          </Link>

          {/* MEIO: NAVEGAÇÃO CENTRALIZADA */}
          <nav className="nav-links">
            <NavLink
              to="/solicitar" 
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
            >
              Solicitar Transporte
            </NavLink>

            <NavLink
              to="/painelatm"
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
            >
              Rastrear Pedidos
            </NavLink>

            <NavLink
              to="/financeiro"
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
            >
              BI Financeiro
            </NavLink>
          </nav>

          {/* LADO DIREITO: VAZIO */}
          <div className="auth-section">
          </div>
        </header>
      )}

      {/* 3️⃣ MUDANÇA AQUI: Trocamos a verificação "isHome" por "isTelaCheia" para remover o padding da tag main */}
      <main className="app-main" style={isTelaCheia ? { padding: 0, maxWidth: '100%' } : {}}>
        
        {/* Mantemos o isHome aqui dentro, pois apenas a Home precisa do flex/center para centralizar os cartões */}
        <div className="fade-in" style={isHome ? { minHeight: '100vh', display: 'flex', alignItems: 'center' } : {}}>
          <Outlet />
        </div>
      </main>

    </div>
  );
}