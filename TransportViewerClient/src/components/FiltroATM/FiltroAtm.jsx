// src/components/FiltroAtm/FiltroAtm.jsx
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';

import './FiltroAtm.css';

const XCircle = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
const X = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

export default function FiltroAtm({ atms, filtros, onFiltroChange, onLimpar, aberto, onClose }) {
  
  // Extrai opções únicas das suas ATMs para os Selects
  const opcoesFiltro = useMemo(() => {
    const status = new Set();
    const solicitantes = new Set();
    const veiculos = new Set();
    const transportadoras = new Set();

    atms.forEach(atm => {
      if (atm.status) status.add(atm.status.trim());
      if (atm.solicitacao) solicitantes.add(atm.solicitacao.trim());
      if (atm.veiculo) veiculos.add(atm.veiculo.trim());
      if (atm.transportadora?.nome) transportadoras.add(atm.transportadora.nome.trim());
    });

    const formatarOpcoes = (set) => Array.from(set).filter(Boolean).sort().map(item => ({ value: item, label: item }));

    return {
      status: formatarOpcoes(status),
      solicitantes: formatarOpcoes(solicitantes),
      veiculos: formatarOpcoes(veiculos),
      transportadoras: formatarOpcoes(transportadoras)
    };
  }, [atms]);

  const temFiltroAtivo = Object.values(filtros).some(valor => valor !== '' && valor !== undefined);

  const handleMultiSelectChange = (name, selectedOptions) => {
    const valores = selectedOptions ? selectedOptions.map(opt => opt.value).join(',') : '';
    onFiltroChange({ target: { name, value: valores } });
  };

  const getMultiValue = (str) => {
    if (!str) return [];
    return str.split(',').filter(Boolean).map(v => ({ value: v.trim(), label: v.trim() }));
  };

  const selectStyles = {
    control: (base) => ({ ...base, borderColor: '#d1d5db', boxShadow: 'none', '&:hover': { borderColor: '#a7f3d0' }, borderRadius: '0.375rem', padding: '0.1rem' }),
    multiValue: (base) => ({ ...base, backgroundColor: '#d1fae5', borderRadius: '0.25rem' }),
    multiValueLabel: (base) => ({ ...base, color: '#065f46', fontWeight: 'bold' }),
    multiValueRemove: (base) => ({ ...base, color: '#065f46', ':hover': { backgroundColor: '#a7f3d0', color: '#064e3b' } }),
    option: (base, state) => ({ ...base, color: '#111827', backgroundColor: state.isFocused ? '#f3f4f6' : 'white', cursor: 'pointer', '&:active': { backgroundColor: '#e5e7eb' } }),
    singleValue: (base) => ({ ...base, color: '#111827' })
  };

  if (!aberto) return null;

  return createPortal(
    <div className="filtro-modal__overlay">
      <div className="filtro-modal__content fade-in">
        
        <div className="filtro-modal__header">
          <div>
            <span className="filtro-modal__subtitle">Refine sua busca na tabela</span>
            <h2 className="filtro-modal__title">Filtros Avançados</h2>
          </div>
          <button onClick={onClose} className="filtro-modal__close-btn"><X size={24} /></button>
        </div>

        <div className="filtro-modal__body">
          <div className="filtro-modal__grid">
            
            <div className="filtro-block">
              <label className="filtro-block__label filtro-block__label--block">Status do Pedido</label>
              <Select isMulti options={opcoesFiltro.status} value={getMultiValue(filtros.status)} onChange={(opts) => handleMultiSelectChange('status', opts)} placeholder="Ex: Entregue, Em rota..." styles={selectStyles} />
            </div>

            <div className="filtro-block">
              <label className="filtro-block__label filtro-block__label--block">Solicitante</label>
              <Select isMulti options={opcoesFiltro.solicitantes} value={getMultiValue(filtros.solicitante)} onChange={(opts) => handleMultiSelectChange('solicitante', opts)} placeholder="Selecionar Solicitantes..." styles={selectStyles} />
            </div>

            <div className="filtro-block">
              <label className="filtro-block__label filtro-block__label--block">Veículo</label>
              <Select isMulti options={opcoesFiltro.veiculos} value={getMultiValue(filtros.veiculo)} onChange={(opts) => handleMultiSelectChange('veiculo', opts)} placeholder="Selecionar Veículos..." styles={selectStyles} />
            </div>

            <div className="filtro-block">
              <label className="filtro-block__label filtro-block__label--block">Transportadora</label>
              <Select isMulti options={opcoesFiltro.transportadoras} value={getMultiValue(filtros.transportadora)} onChange={(opts) => handleMultiSelectChange('transportadora', opts)} placeholder="Selecionar Transportadoras..." styles={selectStyles} />
            </div>

          </div>
        </div>

        <div className="filtro-modal__footer">
          <div>
            {temFiltroAtivo && (
              <button onClick={() => { onLimpar(); onClose(); }} className="filtro-modal__btn-clear">
                <XCircle size={16} /> Limpar Filtros
              </button>
            )}
          </div>
          <button onClick={onClose} className="filtro-modal__btn-submit">Aplicar Filtros</button>
        </div>

      </div>
    </div>,
    document.body
  );
}