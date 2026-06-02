import React from 'react';
import { createPortal } from 'react-dom'; // 👈 1. Importa o Portal
import { useNavigate } from 'react-router-dom';
import './AbaSimulacao.css';

export default function AbaSimulacao() {
  const navigate = useNavigate();

  const handleClique = () => {
    navigate('/simulador-veiculo', { state: { abrirRelatorio: true } });
  };

  // 👈 2. Retorna o componente dentro do createPortal apontando para o document.body
  return createPortal(
    <div className="aba-simulacao-container" onClick={handleClique}>
      <div className="aba-simulacao-content">
        <i className="fa-solid fa-truck-ramp-box"></i>
        <span>Simular Carga</span>
      </div>
    </div>,
    document.body
  );
}