import React from 'react';
import './SplashScreen.css';

// Usando o ícone de caminhão que você já tem no layout
const TruckIcon = ({ size = 48 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 17h4V5H2v12h3" />
    <path d="M20 17h2v-9h-5V5H10" />
    <path d="M17 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  </svg>
);

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon pulse-animation">
          <TruckIcon />
        </div>
        <h1 className="splash-title">
          ATM<span className="text-primary">Log</span>
        </h1>
        <p className="splash-subtitle">Carregando o sistema...</p>
        <div className="splash-spinner"></div>
      </div>
    </div>
  );
}