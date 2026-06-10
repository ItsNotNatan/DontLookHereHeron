// src/pages/MedidorCargas/StatsBar.jsx
import React from 'react';

export default function StatsBar({ vVol, vBv, vArea, areaMax, maxOcupacao, actVeh, fCls, fSv, fBg, vPct, aPct }) {
  return (
    <div className="statsbar">
      <div className="stat">
        <div className="sl">Uso (Vol / Área)</div>
        <div className="sv" style={{ fontSize: '1.1rem' }}>{vVol.toFixed(1)}m³ / {vArea.toFixed(1)}m²</div>
      </div>
      <div className="stat">
        <div className="sl">Baú (Vol / Área)</div>
        <div className="sv" style={{ fontSize: '1.1rem' }}>
          {actVeh.vol ? actVeh.vol.toFixed(1) : vBv.toFixed(1)}m³ / {areaMax.toFixed(1)}m²
        </div>
      </div>
      <div className="occ">
        <div className="occ-row">
          <span className="sl">Maior Ocupação (Vol: {vPct}% | Piso: {aPct}%)</span>
          <span className={`sv ${fCls}`} style={{ fontSize: '0.88rem' }}>{Math.min(200, maxOcupacao)}%</span>
        </div>
        <div className="occ-track">
          <div className="occ-fill" style={{ width: `${Math.min(100, maxOcupacao)}%`, background: fBg }}></div>
        </div>
      </div>
      <div className="stat">
        <div className="sl">Status</div>
        <div className={`sv ${fCls}`}>{fSv}</div>
      </div>
    </div>
  );
}