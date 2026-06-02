// src/components/VehicleGrid/VehicleGrid.jsx
import React from 'react';

export default function VehicleGrid({ veiculos, selVeh, onSelectVeh, checkFit }) {
  return (
    <div className="sec" style={{ paddingBottom: '30px' }}>
      <div className="stitle">Veículo</div>
      <div className="vgrid">
        {veiculos.map(v => (
          <div key={v.id} className={`vc ${selVeh === v.id ? 'on' : ''}`} onClick={() => onSelectVeh(v.id)}>
            <div className={`fdot ${checkFit(v)}`}></div>
            
            {/* 🟢 Renderizando a Imagem em vez de texto */}
            <img 
              src={v.icon} 
              alt={v.name} 
              style={{ 
                height: '38px', 
                objectFit: 'contain', 
                margin: '0 auto 8px auto', 
                display: 'block' 
              }} 
            />
            
            <div className="vc-name">{v.name}</div>
            <div className="vc-dim">{v.L}×{v.W}×{v.H}m · {v.vol ? v.vol.toFixed(1) + ' m³' : '2×deck'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}