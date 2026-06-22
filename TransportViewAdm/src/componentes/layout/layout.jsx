// src/componentes/layout/layout.jsx
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './layout.css';

const Truck = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-9h-5V5H10" /><path d="M17 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>;
const ChartLine = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>;
const UserGear = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19.5 13.5v.5c0 .28.22.5.5.5h.5a.5.5 0 0 0 .5-.5v-.5a.5.5 0 0 0-.5-.5h-.5a.5.5 0 0 0-.5.5Z" /><path d="m20.5 13-1-1" /><path d="m19 14.5-1 1" /><path d="M20.5 16l-1-1" /><path d="m19 12.5-1 1" /></svg>;
const UserCircle = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" /></svg>;
const LogOut = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>;
const FolderKanban = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/></svg>;
const MapPin = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const Building = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;

export default function Layout() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Usuário';
  const userPerfil = localStorage.getItem('perfil') || 'Operador'; 

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error("Erro ao avisar servidor do logout:", error);
    } finally {
      localStorage.clear();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Truck size={28} className="text-primary" />
          <h1 className="sidebar-title">ATM<span className="text-primary">Log</span></h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Truck size={20} /><span>Tabela Principal</span>
          </NavLink>

          {/* 🟢 O menu de configurações extras agora só aparece para o Admin */}
          {userPerfil === 'Admin' && (
            <>
              <NavLink to="/editor-projetos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FolderKanban size={20} /><span>Gestão de Projetos</span>
              </NavLink>
              <NavLink to="/editor-enderecos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <MapPin size={20} /><span>Gestão de Endereços</span>
              </NavLink>
              <NavLink to="/editor-transportadoras" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Building size={20} /><span>Transportadoras</span>
              </NavLink>
              <NavLink to="/editor-motivos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ChartLine size={20} /><span>Editor de Motivos</span>
              </NavLink>
              <NavLink to="/gestao-usuarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserGear size={20} /><span>Gestão de Usuários</span>
              </NavLink>
            </>
          )}
        </nav>
        
        <div className="sidebar-footer">
          Perfil Ativo: <strong>{userPerfil}</strong>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2 className="topbar-title">Painel Administrador</h2>
          <div className="user-controls">
            <div className="user-info-wrapper">
              <div className="user-avatar"><UserCircle size={20} /></div>
              <div className="user-details">
                <span className="user-name">{userName}</span>
                <span className="user-status"><span className="status-dot"></span> Online</span>
              </div>
            </div>
            <button className="btn-logout" title="Sair do sistema" onClick={handleLogout}>
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
