// src/pages/Home/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css'; // 🟢 IMPORTAÇÃO DO ARQUIVO CSS

// 🟢 IMPORTAÇÃO DA LOGO DA EMPRESA
import logoComau from '../../assets/logo-comau.png';

// Ícones SVG para os botões
const TruckIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-9h-5V5H10" /><path d="M17 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>;
const SearchIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const ChartIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
const BoxIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;

export default function Home() {
  const userName = localStorage.getItem('userName') || 'Colaborador';

  return (
    <div className="home-hub-container fade-in">
      
      {/* 🌟 PLANO DE FUNDO ONDULADO (SVG) 🌟 */}
      <div className="wave-container">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#eff6ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path fill="url(#wave-gradient)" d="M0,192L60,202.7C120,213,240,235,360,213.3C480,192,600,128,720,112C840,96,960,128,1080,144C1200,160,1320,160,1380,160L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
        </svg>
      </div>

      <div className="home-hub-content-wrapper">
        <div className="home-hub-header">
          {/* RENDERIZAÇÃO DA LOGO */}
          <img src={logoComau} alt="Logo Comau" className="home-hub-logo" />
          
          <h2 className="home-greeting">
          Bem-vindo ao ATM<span className="logo-accent">Log</span>
          </h2>
          <p className="home-instructions">Uma plataforma centralizada para a solicitação, o rastreamento em tempo real e a gestão inteligente de todos os seus transportes nacionais.  </p>
        </div>

        <div className="home-hub-grid">
          
          {/* CARD 1: Solicitar Transporte */}
          <Link to="/solicitar" className="hub-card hub-card--blue">
            <div className="hub-card-icon"><TruckIcon /></div>
            <h3>Solicitar Transporte</h3>
            <p>Abra novas requisições de transporte preenchendo as especificações da carga.</p>
            <span className="hub-card-action">Acessar Módulo <span className="arrow-transition">&rarr;</span></span>
          </Link>

          {/* CARD 2: Painel de Controle */}
          <Link to="/painelatm" className="hub-card hub-card--indigo">
            <div className="hub-card-icon"><SearchIcon /></div>
            <h3>Rastrear Pedidos</h3>
            <p>Acompanhe e faça a gestão em tempo real do status de todas as solicitações ativas.</p>
            <span className="hub-card-action">Acessar Módulo <span className="arrow-transition">&rarr;</span></span>
          </Link>

          {/* CARD 3: Medidor de Cargas */}
          <Link to="/simulador-veiculo" className="hub-card hub-card--emerald">
            <div className="hub-card-icon"><BoxIcon /></div>
            <h3>Simular Cargas</h3>
            <p>Simule a cubagem e otimize a ocupação volumétrica física dos veículos em 3D.</p>
            <span className="hub-card-action">Acessar Módulo <span className="arrow-transition">&rarr;</span></span>
          </Link>

          {/* CARD 4: Financeiro */}
          <Link to="/financeiro" className="hub-card hub-card--amber">
            <div className="hub-card-icon"><ChartIcon /></div>
            <h3>BI Financeiro</h3>
            <p>Identifique gargalos financeiros, acompanhe a evolução dos custos logísticos.</p>
            <span className="hub-card-action">Acessar Módulo <span className="arrow-transition">&rarr;</span></span>
          </Link>

        </div>
      </div>
    </div>
  );
}