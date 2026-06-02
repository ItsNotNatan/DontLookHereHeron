// src/pages/MedidorCargas/components/ModalRelatorio.jsx
import React from 'react';

export default function ModalRelatorio({ veiculo, cargas, ocupacao, onClose }) {
  if (!veiculo) return null;
  
  return (
    <div className="modal-overlay-3d">
      <div className="modal-backdrop-3d" onClick={onClose}></div>
      <div className="modal-card-3d">
        <header className="modal-header-3d">
          <h2 className="modal-title-3d">Resumo do Carregamento</h2>
          <button onClick={onClose} className="modal-close-btn-3d">✕</button>
        </header>
        <div className="modal-body-3d">
          <div className="modal-summary-grid">
            <div className="summary-card-3d">
              <p className="summary-label">Veículo Base</p>
              <p className="summary-value">{veiculo.name}</p>
            </div>
            <div className="summary-card-3d">
              <p className="summary-label">Ocupação Volumétrica</p>
              <p className="summary-value" style={{ color: ocupacao > 100 ? 'var(--red)' : 'var(--green)' }}>
                {ocupacao}%
              </p>
            </div>
          </div>
          <div className="modal-table-container">
            {cargas.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Nenhuma carga adicionada.</p>
            ) : (
              cargas.map(c => (
                <div key={c.id} className="modal-table-row">
                    <div className="item-with-dot">
                      <div className="item-dot" style={{ backgroundColor: c.color, width: '10px', height: '10px', borderRadius: '50%' }}></div>
                      <span>{c.name}</span>
                    </div>
                    <strong>{c.qty} un.</strong>
                </div>
              ))
            )}
          </div>
        </div>
        <footer className="modal-footer-3d">
          <button onClick={onClose} className="btn-finalizar-3d">Fechar</button>
        </footer>
      </div>
    </div>
  );
}