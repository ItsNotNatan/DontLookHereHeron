// src/componentes/FiltroOP/FiltroOP.jsx
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import './FiltroOP.css';

const XCircle = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
const X = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const formatarDataParaBR = (d) => {
  if (!d) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(d)) return d.replace(/-/g, '/');
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(d)) {
    const [ano, mes, dia] = d.split('/');
    return `${dia}/${mes}/${ano}`;
  }
  return d; 
};

export default function FiltroOP({ atms, filtros, onFiltroChange, onLimpar, aberto, onClose }) {
  const [modoId, setModoId] = useState('especifico');
  const [modoPedido, setModoPedido] = useState('especifico');
  const [modoNf, setModoNf] = useState('especifico');
  const [modoData, setModoData] = useState('lote');

  const shortId = (id) => id ? id.substring(0, 8).toUpperCase() : 'N/A';

  const opcoesFiltro = useMemo(() => {
    const ids = new Set();
    const solicitantes = new Set();
    const pedidos = new Set();
    const nfs = new Set();
    const statusList = new Set();
    const transportadoras = new Set();
    const datas = new Set();

    atms.forEach(atm => {
      if (atm.numero_atm) ids.add(String(atm.numero_atm));
      else if (atm.id) ids.add(shortId(atm.id)); 
      
      if (atm.solicitacao) solicitantes.add(atm.solicitacao);
      if (atm.pedido_compra) pedidos.add(atm.pedido_compra);
      if (atm.nf) nfs.add(atm.nf);
      if (atm.status) statusList.add(atm.status);
      if (atm.transportadora?.nome) transportadoras.add(atm.transportadora.nome);
      if (atm.data_solicitacao) datas.add(atm.data_solicitacao.split('T')[0]); 
    });

    const formatarOpcoes = (set) => Array.from(set).filter(Boolean).sort().map(item => ({ value: item, label: item }));

    const formatarOpcoesData = Array.from(datas).sort().map(d => {
      return { value: d, label: formatarDataParaBR(d) };
    });

    return {
      ids: Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).map(id => ({ value: id, label: id })),
      solicitantes: formatarOpcoes(solicitantes),
      pedidos: formatarOpcoes(pedidos),
      nfs: formatarOpcoes(nfs),
      status: formatarOpcoes(statusList),
      transportadoras: formatarOpcoes(transportadoras),
      datas: formatarOpcoesData 
    };
  }, [atms]);

  const alternarModo = (campo, modo) => {
    if (campo === 'id') { setModoId(modo); onFiltroChange({ target: { name: 'id', value: '' } }); }
    if (campo === 'pedido') { setModoPedido(modo); onFiltroChange({ target: { name: 'pedido', value: '' } }); }
    if (campo === 'nf') { setModoNf(modo); onFiltroChange({ target: { name: 'nf', value: '' } }); }
    if (campo === 'data') { 
      setModoData(modo); 
      onFiltroChange({ target: { name: 'data_inicio', value: '' } }); 
      onFiltroChange({ target: { name: 'data_fim', value: '' } }); 
      onFiltroChange({ target: { name: 'data_especifica', value: '' } }); 
    }
  };

  const handleMultiSelectChange = (name, selectedOptions) => {
    const valores = selectedOptions ? selectedOptions.map(opt => opt.value).join(',') : '';
    onFiltroChange({ target: { name, value: valores } });
  };

  const handleRangeChange = (campo, tipo, selectedOption) => {
    let de = ''; let ate = '';
    if (filtros[campo] && filtros[campo].includes('-')) {
      [de, ate] = filtros[campo].split('-').map(s => s.trim());
    }
    if (tipo === 'de') de = selectedOption ? selectedOption.value : '';
    if (tipo === 'ate') ate = selectedOption ? selectedOption.value : '';
    onFiltroChange({ target: { name: campo, value: (de || ate) ? `${de}-${ate}` : '' } });
  };

  const getMultiValue = (str) => {
    if (!str) return [];
    return str.split(',').filter(Boolean).map(v => ({ value: v.trim(), label: v.trim() }));
  };

  const getMultiValueData = (str) => {
    if (!str) return [];
    return str.split(',').filter(Boolean).map(v => {
      const valorLimpo = v.trim();
      return { value: valorLimpo, label: formatarDataParaBR(valorLimpo) };
    });
  };

  const getRangeValues = (campo, modo) => {
    let currentDe = null; let currentAte = null;
    if (filtros[campo] && modo === 'lote' && filtros[campo].includes('-')) {
      const [de, ate] = filtros[campo].split('-').map(s => s.trim());
      currentDe = de ? { value: de, label: de } : null;
      currentAte = ate ? { value: ate, label: ate } : null;
    }
    return { currentDe, currentAte };
  };

  const rangeId = getRangeValues('id', modoId);
  const rangePedido = getRangeValues('pedido', modoPedido);
  const rangeNf = getRangeValues('nf', modoNf);

  const selectStyles = {
    control: (base) => ({ ...base, borderColor: '#d1d5db', boxShadow: 'none', '&:hover': { borderColor: '#9ca3af' }, borderRadius: '0.375rem', padding: '0.1rem' }),
    multiValue: (base) => ({ ...base, backgroundColor: '#dbeafe', borderRadius: '0.25rem' }),
    multiValueLabel: (base) => ({ ...base, color: '#1e40af', fontWeight: 'bold' }),
    multiValueRemove: (base) => ({ ...base, color: '#1e40af', ':hover': { backgroundColor: '#bfdbfe', color: '#1e3a8a' } }),
    option: (base, state) => ({
      ...base,
      color: '#111827', 
      backgroundColor: state.isFocused ? '#eff6ff' : 'white', 
      cursor: 'pointer', 
    }),
  };

  if (!aberto) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content fade-in">
        
        <div className="modal-header">
          <div>
            <span className="modal-subtitle">Refine sua busca</span>
            <h2 className="modal-title">Filtros da Operação</h2>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="filtros-grid">
            
            {/* BLOCO: ID ATM */}
            <div className="filtro-card">
              <div className="filtro-header">
                <label className="filtro-label">ID ATM</label>
                <div className="btn-group">
                  <button type="button" onClick={() => alternarModo('id', 'especifico')} className={`btn-modo ${modoId === 'especifico' ? 'ativo' : 'inativo'}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('id', 'lote')} className={`btn-modo ${modoId === 'lote' ? 'ativo' : 'inativo'}`}>Intervalo</button>
                </div>
              </div>
              {modoId === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.ids} value={getMultiValue(filtros.id)} onChange={(opts) => handleMultiSelectChange('id', opts)} placeholder="Selecionar IDs..." styles={selectStyles} />
              ) : (
                <div className="range-container">
                  <div className="range-item"><Select options={opcoesFiltro.ids} value={rangeId.currentDe} onChange={(opt) => handleRangeChange('id', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span className="range-divisor">até</span>
                  <div className="range-item"><Select options={opcoesFiltro.ids} value={rangeId.currentAte} onChange={(opt) => handleRangeChange('id', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: PEDIDOS (PC) */}
            <div className="filtro-card">
              <div className="filtro-header">
                <label className="filtro-label">Pedido(s) (PC)</label>
                <div className="btn-group">
                  <button type="button" onClick={() => alternarModo('pedido', 'especifico')} className={`btn-modo ${modoPedido === 'especifico' ? 'ativo' : 'inativo'}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('pedido', 'lote')} className={`btn-modo ${modoPedido === 'lote' ? 'ativo' : 'inativo'}`}>Intervalo</button>
                </div>
              </div>
              {modoPedido === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.pedidos} value={getMultiValue(filtros.pedido)} onChange={(opts) => handleMultiSelectChange('pedido', opts)} placeholder="Selecionar PCs..." styles={selectStyles} />
              ) : (
                <div className="range-container">
                  <div className="range-item"><Select options={opcoesFiltro.pedidos} value={rangePedido.currentDe} onChange={(opt) => handleRangeChange('pedido', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span className="range-divisor">até</span>
                  <div className="range-item"><Select options={opcoesFiltro.pedidos} value={rangePedido.currentAte} onChange={(opt) => handleRangeChange('pedido', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: NOTAS FISCAIS (NF) */}
            <div className="filtro-card">
              <div className="filtro-header">
                <label className="filtro-label">Nota(s) Fiscal (NF)</label>
                <div className="btn-group">
                  <button type="button" onClick={() => alternarModo('nf', 'especifico')} className={`btn-modo ${modoNf === 'especifico' ? 'ativo' : 'inativo'}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('nf', 'lote')} className={`btn-modo ${modoNf === 'lote' ? 'ativo' : 'inativo'}`}>Intervalo</button>
                </div>
              </div>
              {modoNf === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.nfs} value={getMultiValue(filtros.nf)} onChange={(opts) => handleMultiSelectChange('nf', opts)} placeholder="Selecionar NFs..." styles={selectStyles} />
              ) : (
                <div className="range-container">
                  <div className="range-item"><Select options={opcoesFiltro.nfs} value={rangeNf.currentDe} onChange={(opt) => handleRangeChange('nf', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span className="range-divisor">até</span>
                  <div className="range-item"><Select options={opcoesFiltro.nfs} value={rangeNf.currentAte} onChange={(opt) => handleRangeChange('nf', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* 👇 BLOCO: DATAS (AGORA COM DROPDOWN INTELIGENTE) 👇 */}
            <div className="filtro-card">
               <div className="filtro-header">
                <label className="filtro-label">Período da Solicitação</label>
                <div className="btn-group">
                  <button type="button" onClick={() => alternarModo('data', 'especifico')} className={`btn-modo ${modoData === 'especifico' ? 'ativo' : 'inativo'}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('data', 'lote')} className={`btn-modo ${modoData === 'lote' ? 'ativo' : 'inativo'}`}>Intervalo</button>
                </div>
               </div>
               {modoData === 'especifico' ? (
                 <Select isMulti options={opcoesFiltro.datas} value={getMultiValueData(filtros.data_especifica)} onChange={(opts) => handleMultiSelectChange('data_especifica', opts)} placeholder="Selecionar dias..." styles={selectStyles} noOptionsMessage={() => "Nenhuma data encontrada"} />
               ) : (
                 <div className="range-container">
                    <div className="range-item">
                      <Select 
                        options={opcoesFiltro.datas} 
                        value={filtros.data_inicio ? { value: filtros.data_inicio, label: formatarDataParaBR(filtros.data_inicio) } : null} 
                        onChange={(opt) => onFiltroChange({ target: { name: 'data_inicio', value: opt ? opt.value : '' } })} 
                        placeholder="De (Data)" 
                        styles={selectStyles} 
                        isClearable 
                      />
                    </div>
                    <span className="range-divisor">até</span>
                    <div className="range-item">
                      <Select 
                        options={opcoesFiltro.datas} 
                        value={filtros.data_fim ? { value: filtros.data_fim, label: formatarDataParaBR(filtros.data_fim) } : null} 
                        onChange={(opt) => onFiltroChange({ target: { name: 'data_fim', value: opt ? opt.value : '' } })} 
                        placeholder="Até (Data)" 
                        styles={selectStyles} 
                        isClearable 
                      />
                    </div>
                 </div>
               )}
            </div>

            {/* BLOCO: STATUS */}
            <div className="filtro-card">
              <div className="filtro-header">
                <label className="filtro-label">Status</label>
                <span className="tag-badge">Específicos (Tags)</span>
              </div>
              <Select isMulti options={opcoesFiltro.status} value={getMultiValue(filtros.status)} onChange={(opts) => handleMultiSelectChange('status', opts)} placeholder="Ex: Entregue..." styles={selectStyles} />
            </div>

            {/* BLOCO: TRANSPORTADORA */}
            <div className="filtro-card">
              <div className="filtro-header">
                <label className="filtro-label">Transportadora</label>
                <span className="tag-badge">Específicos (Tags)</span>
              </div>
              <Select isMulti options={opcoesFiltro.transportadoras} value={getMultiValue(filtros.transportadora)} onChange={(opts) => handleMultiSelectChange('transportadora', opts)} placeholder="Selecionar Transportadoras..." styles={selectStyles} />
            </div>

            {/* BLOCO: SOLICITANTE */}
            <div className="filtro-card col-span-2">
              <div className="filtro-header">
                <label className="filtro-label">Solicitante(s)</label>
                <span className="tag-badge">Específicos (Tags)</span>
              </div>
              <Select isMulti options={opcoesFiltro.solicitantes} value={getMultiValue(filtros.solicitante)} onChange={(opts) => handleMultiSelectChange('solicitante', opts)} placeholder="Selecionar Solicitantes..." styles={selectStyles} />
            </div>

          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onLimpar} className="btn-limpar">
            <XCircle size={18} /> Limpar Filtros
          </button>
          
          <button type="button" onClick={onClose} className="btn-submit">
            Ver Resultados
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}