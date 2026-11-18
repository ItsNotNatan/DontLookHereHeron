import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './layout.css'; // Seu CSS atual do layout

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const perfil = localStorage.getItem('perfil'); // Admin, Operador ou Visualizador

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('perfil');
    navigate('/login');
  };

  // Função auxiliar para marcar o menu ativo
  const isActive = (path) => location.pathname === path ? 'menu-ativo' : '';

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>ATMLog Adm</h2>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li className={isActive('/')}>
              <Link to="/">Painel de Pedidos</Link>
            </li>

            {/* ✅ NOVO BOTÃO DA NAVBAR ADICIONADO AQUI */}
            {(perfil === 'Admin' || perfil === 'Operador') && (
              <li className={isActive('/controlesla')}>
                <Link to="/controlesla">Controle de SLA</Link>
              </li>
            )}

            <hr className="menu-divisor" />

            {(perfil === 'Admin' || perfil === 'Operador') && (
              <>
                <li className={isActive('/projetos')}><Link to="/projetos">Projetos (WBS)</Link></li>
                <li className={isActive('/transportadoras')}><Link to="/transportadoras">Transportadoras</Link></li>
                <li className={isActive('/enderecos')}><Link to="/enderecos">Endereços Base</Link></li>
                <li className={isActive('/motivos')}><Link to="/motivos">Motivos (Desvios)</Link></li>
              </>
            )}

            {perfil === 'Admin' && (
              <>
                <li className={isActive('/veiculos')}><Link to="/veiculos">Veículos</Link></li>
                <li className={isActive('/usuarios')}><Link to="/usuarios">Usuários</Link></li>
              </>
            )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <p>Logado como: <strong>{perfil}</strong></p>
          <button className="btn-logout" onClick={handleLogout}>Sair do sistema</button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
