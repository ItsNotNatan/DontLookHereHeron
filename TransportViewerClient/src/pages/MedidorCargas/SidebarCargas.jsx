// src/pages/MedidorCargas/SidebarCargas.jsx
import React from 'react';
import CargoForm from '../../components/CargoForm/CargoForm';
import VehicleGrid from '../../components/VehicleGrid/VehicleGrid';

export default function SidebarCargas({
  unit, setUnit, cargas, selCid, setSelCid,
  handleAddCargo, handleDelCargo, fmt, focusCargo,
  actVeh, veiculosBD, selVeh, handleSelectVeh, checkFit
}) {
  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sb-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sec">
          <div className="stitle">Unidade de Medida</div>
          <div className="urow">
            <button className={`ubtn ${unit === 'm' ? 'on' : ''}`} onClick={() => setUnit('m')}>Metros (m)</button>
            <button className={`ubtn ${unit === 'cm' ? 'on' : ''}`} onClick={() => setUnit('cm')}>Centímetros (cm)</button>
          </div>
        </div>

        <CargoForm unit={unit} onAddCargo={handleAddCargo} />

        <div className="sec">
          <div className="stitle">
            Cargas
            <span id="cnt" style={{ background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.6rem' }}>
              {(cargas || []).length}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '0.6rem', marginLeft: 'auto', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
              Clique para posicionar
            </span>
          </div>
          <div className="clist">
            {(!cargas || cargas.length === 0) ? (
              <div className="no-c">Nenhuma carga adicionada.</div>
            ) : (
              cargas.map(c => {
                const vol = (parseFloat(c.comprimento || 0) * parseFloat(c.largura || 0) * parseFloat(c.altura || 0) * parseInt(c.quantidade || 1)).toFixed(3);
                const isSel = selCid === c.id;
                return (
                  <div key={c.id} className={`ci ${isSel ? 'sel' : ''}`} onClick={() => setSelCid(c.id)}>
                    <div className="ci-top">
                      <div className="ci-dot" style={{ background: c.cor }}></div>
                      <div className="ci-body">
                        <div className="ci-name">{c.nome}{parseInt(c.quantidade || 1) > 1 && <span className="ci-qty">×{c.quantidade}</span>}</div>
                        <div className="ci-dim">{fmt(parseFloat(c.comprimento || 0))} × {fmt(parseFloat(c.largura || 0))} × {fmt(parseFloat(c.altura || 0))}</div>
                        <div className="ci-vol">{vol} m³ total</div>
                      </div>
                      <div className="ci-acts">
                        <button className="ci-act" onClick={(e) => { e.stopPropagation(); focusCargo(c.id); }} title="Focar">◎</button>
                        <button className="ci-act ci-del" onClick={(e) => { e.stopPropagation(); handleDelCargo(c.id); }} title="Remover">✕</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <VehicleGrid veiculos={veiculosBD} selVeh={selVeh} onSelectVeh={handleSelectVeh} checkFit={checkFit} />
      </div>
    </aside>
  );
}