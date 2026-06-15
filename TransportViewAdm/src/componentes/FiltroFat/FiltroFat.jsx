// src/componentes/FiltroFat/FiltroFat.jsx
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import './FiltroFat.css';

const XCircle = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
);
const X = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

export default function FiltroFat({ atms, filtros, onFiltroChange, onLimpar, aberto, onClose }) {
  const [modoFatura, setModoFatura] = useState('especifico');
  const [modoPep, setModoPep] = useState('especifico');
  const [modoDataMap, setModoDataMap] = useState('lote');
  const [modoDataEmi, setModoDataEmi] = useState('lote');
  const [modoDataVenc, setModoDataVenc] = useState('lote');
  const [modoData, setModoData] = useState('lote');

  // Função auxiliar para transformar YYYY-MM-DD em DD/MM/YYYY no Select
  const formatarDataParaBR = (dataStr) => {
    if (!dataStr) return '';
    if (dataStr.includes('/')) return dataStr;
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const opcoesFiltro = useMemo(() => {
    const faturas = new Set();
    const peps = new Set();
    const tiposDoc = new Set();
    const validacoes = new Set();
    const datasMap = new Set();
    const datasEmi = new Set();
    const datasVenc = new Set();

    atms.forEach(atm => {
      if (atm.fatura_cte) faturas.add(atm.fatura_cte.trim());
      if (atm.elemento_pep_cc_wbs) peps.add(atm.elemento_pep_cc_wbs.trim());
      else if (atm.wbs) peps.add(atm.wbs.trim());
      if (atm.tipo_documento) tiposDoc.add(atm.tipo_documento.trim());
      if (atm.validacao_pep) validacoes.add(atm.validacao_pep.trim());

      if (atm.data_mapeamento) datasMap.add(atm.data_mapeamento.split('T')[0]);
      if (atm.data_emissao) datasEmi.add(atm.data_emissao.split('T')[0]);
      if (atm.vencimento) datasVenc.add(atm.vencimento.split('T')[0]);
    });

    
    const formatarOpcoes = (set) => Array.from(set).filter(Boolean).sort().map(item => ({ value: item, label: item }));

    const formatarData = (set) => Array.from(set).filter(Boolean).sort().map(d => {
      const [ano, mes, dia] = d.split('-');
      return { value: d, label: `${dia}/${mes}/${ano}` };
    });

    return {
      faturas: formatarOpcoes(faturas),
      peps: formatarOpcoes(peps),
      tiposDoc: formatarOpcoes(tiposDoc),
      validacoes: formatarOpcoes(validacoes),
      datasMap: formatarData(datasMap),
      datasEmi: formatarData(datasEmi),
      datasVenc: formatarData(datasVenc),
      datas: formatarData(datasEmi) // Adicionado para o Período da Solicitação
    };
  }, [atms]);

  const temFiltroAtivo = [
    filtros.fatura, filtros.elemento_pep, filtros.registrado_sap,
    filtros.tipo_documento, filtros.validacao_pep,
    filtros.data_map_inicio, filtros.data_map_fim, filtros.data_map_especifica,
    filtros.data_emissao_inicio, filtros.data_emissao_fim, filtros.data_emi_especifica,
    filtros.data_venc_inicio, filtros.data_venc_fim, filtros.data_venc_especifica,
    filtros.data_inicio, filtros.data_fim, filtros.data_especifica
  ].some(valor => valor !== '' && valor !== undefined);

  const alternarModo = (campo, modo) => {
    if (campo === 'fatura') { setModoFatura(modo); onFiltroChange({ target: { name: 'fatura', value: '' } }); }
    if (campo === 'pep') { setModoPep(modo); onFiltroChange({ target: { name: 'elemento_pep', value: '' } }); }
    if (campo === 'data_map') { setModoDataMap(modo); onFiltroChange({ target: { name: 'data_map_inicio', value: '' } }); onFiltroChange({ target: { name: 'data_map_fim', value: '' } }); onFiltroChange({ target: { name: 'data_map_especifica', value: '' } }); }
    if (campo === 'data_emi') { setModoDataEmi(modo); onFiltroChange({ target: { name: 'data_emissao_inicio', value: '' } }); onFiltroChange({ target: { name: 'data_emissao_fim', value: '' } }); onFiltroChange({ target: { name: 'data_emi_especifica', value: '' } }); }
    if (campo === 'data_venc') { setModoDataVenc(modo); onFiltroChange({ target: { name: 'data_venc_inicio', value: '' } }); onFiltroChange({ target: { name: 'data_venc_fim', value: '' } }); onFiltroChange({ target: { name: 'data_venc_especifica', value: '' } }); }
    if (campo === 'data') { setModoData(modo); onFiltroChange({ target: { name: 'data_inicio', value: '' } }); onFiltroChange({ target: { name: 'data_fim', value: '' } }); onFiltroChange({ target: { name: 'data_especifica', value: '' } }); }
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
      const [ano, mes, dia] = v.trim().split('-');
      return { value: v.trim(), label: `${dia}/${mes}/${ano}` };
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

  const rangeFatura = getRangeValues('fatura', modoFatura);
  const rangePep = getRangeValues('elemento_pep', modoPep);

  const selectStyles = {
    control: (base) => ({ ...base, borderColor: '#d1d5db', boxShadow: 'none', '&:hover': { borderColor: '#a7f3d0' }, borderRadius: '0.375rem', padding: '0.1rem' }),
    multiValue: (base) => ({ ...base, backgroundColor: '#d1fae5', borderRadius: '0.25rem' }),
    multiValueLabel: (base) => ({ ...base, color: '#065f46', fontWeight: 'bold' }),
    multiValueRemove: (base) => ({ ...base, color: '#065f46', ':hover': { backgroundColor: '#a7f3d0', color: '#064e3b' } }),
    option: (base, state) => ({
      ...base,
      color: '#111827',
      backgroundColor: state.isFocused ? '#f3f4f6' : 'white',
      cursor: 'pointer',
      '&:active': { backgroundColor: '#e5e7eb' }
    }),
    singleValue: (base) => ({
      ...base,
      color: '#111827'
    })
  };

  if (!aberto) return null;

  return createPortal(
    <div className="filtro-modal__overlay">
      <div className="filtro-modal__content fade-in">

        <div className="filtro-modal__header">
          <div>
            <span className="filtro-modal__subtitle">Refine sua busca financeira</span>
            <h2 className="filtro-modal__title">Filtros de Faturamento</h2>
          </div>
          <button onClick={onClose} className="filtro-modal__close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="filtro-modal__body">
          <div className="filtro-modal__grid">

            {/* BLOCO: FATURA */}
            <div className="filtro-block">
              <div className="filtro-block__header">
                <label className="filtro-block__label">Fatura</label>
                <div className="filtro-block__btn-group">
                  <button type="button" onClick={() => alternarModo('fatura', 'especifico')} className={`filtro-block__btn-mode ${modoFatura === 'especifico' ? 'filtro-block__btn-mode--active' : ''}`}>Específicas</button>
                  <button type="button" onClick={() => alternarModo('fatura', 'lote')} className={`filtro-block__btn-mode ${modoFatura === 'lote' ? 'filtro-block__btn-mode--active' : ''}`}>Intervalo</button>
                </div>
              </div>
              {modoFatura === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.faturas} value={getMultiValue(filtros.fatura)} onChange={(opts) => handleMultiSelectChange('fatura', opts)} placeholder="Selecionar Faturas..." styles={selectStyles} />
              ) : (
                <div className="filtro-block__range-container">
                  <div className="filtro-block__range-item"><Select options={opcoesFiltro.faturas} value={rangeFatura.currentDe} onChange={(opt) => handleRangeChange('fatura', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span className="filtro-block__range-sep">até</span>
                  <div className="filtro-block__range-item"><Select options={opcoesFiltro.faturas} value={rangeFatura.currentAte} onChange={(opt) => handleRangeChange('fatura', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: ELEMENTO PEP */}
            <div className="filtro-block">
              <div className="filtro-block__header">
                <label className="filtro-block__label">Elemento PEP</label>
                <div className="filtro-block__btn-group">
                  <button type="button" onClick={() => alternarModo('pep', 'especifico')} className={`filtro-block__btn-mode ${modoPep === 'especifico' ? 'filtro-block__btn-mode--active' : ''}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('pep', 'lote')} className={`filtro-block__btn-mode ${modoPep === 'lote' ? 'filtro-block__btn-mode--active' : ''}`}>Intervalo</button>
                </div>
              </div>
              {modoPep === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.peps} value={getMultiValue(filtros.elemento_pep)} onChange={(opts) => handleMultiSelectChange('elemento_pep', opts)} placeholder="Selecionar PEPs..." styles={selectStyles} />
              ) : (
                <div className="filtro-block__range-container">
                  <div className="filtro-block__range-item"><Select options={opcoesFiltro.peps} value={rangePep.currentDe} onChange={(opt) => handleRangeChange('elemento_pep', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span className="filtro-block__range-sep">até</span>
                  <div className="filtro-block__range-item"><Select options={opcoesFiltro.peps} value={rangePep.currentAte} onChange={(opt) => handleRangeChange('elemento_pep', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: DATA MAPEAMENTO */}
            <div className="filtro-block">
              <div className="filtro-block__header">
                <label className="filtro-block__label">Data Mapeamento</label>
                <div className="filtro-block__btn-group">
                  <button type="button" onClick={() => alternarModo('data_map', 'especifico')} className={`filtro-block__btn-mode ${modoDataMap === 'especifico' ? 'filtro-block__btn-mode--active' : ''}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('data_map', 'lote')} className={`filtro-block__btn-mode ${modoDataMap === 'lote' ? 'filtro-block__btn-mode--active' : ''}`}>Intervalo</button>
                </div>
              </div>
              {modoDataMap === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.datasMap} value={getMultiValueData(filtros.data_map_especifica)} onChange={(opts) => handleMultiSelectChange('data_map_especifica', opts)} placeholder="Selecionar dias..." styles={selectStyles} noOptionsMessage={() => "Nenhuma data"} />
              ) : (
                <div className="filtro-block__range-container">
                  <div className="filtro-block__range-item">
                    <Select
                      options={opcoesFiltro.datasMap}
                      value={filtros.data_map_inicio ? { value: filtros.data_map_inicio, label: formatarDataParaBR(filtros.data_map_inicio) } : null}
                      onChange={(opt) => onFiltroChange({ target: { name: 'data_map_inicio', value: opt ? opt.value : '' } })}
                      placeholder="De (Data)"
                      styles={selectStyles}
                      isClearable
                    />
                  </div>
                  <span className="filtro-block__range-sep">até</span>
                  <div className="filtro-block__range-item">
                    <Select
                      options={opcoesFiltro.datasMap}
                      value={filtros.data_map_fim ? { value: filtros.data_map_fim, label: formatarDataParaBR(filtros.data_map_fim) } : null}
                      onChange={(opt) => onFiltroChange({ target: { name: 'data_map_fim', value: opt ? opt.value : '' } })}
                      placeholder="Até (Data)"
                      styles={selectStyles}
                      isClearable
                    />
                  </div>
                </div>
              )}
            </div>

            {/* BLOCO: PERÍODO DA SOLICITAÇÃO */}
            <div className="filtro-block">
              <div className="filtro-block__header">
                <label className="filtro-block__label">Período da Solicitação</label>
                <div className="filtro-block__btn-group">
                  <button type="button" onClick={() => alternarModo('data', 'especifico')} className={`filtro-block__btn-mode ${modoData === 'especifico' ? 'filtro-block__btn-mode--active' : ''}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('data', 'lote')} className={`filtro-block__btn-mode ${modoData === 'lote' ? 'filtro-block__btn-mode--active' : ''}`}>Intervalo</button>
                </div>
              </div>
              {modoData === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.datas} value={getMultiValueData(filtros.data_especifica)} onChange={(opts) => handleMultiSelectChange('data_especifica', opts)} placeholder="Selecionar dias..." styles={selectStyles} noOptionsMessage={() => "Nenhuma data encontrada"} />
              ) : (
                <div className="filtro-block__range-container">
                  <div className="filtro-block__range-item">
                    <Select
                      options={opcoesFiltro.datas}
                      value={filtros.data_inicio ? { value: filtros.data_inicio, label: formatarDataParaBR(filtros.data_inicio) } : null}
                      onChange={(opt) => onFiltroChange({ target: { name: 'data_inicio', value: opt ? opt.value : '' } })}
                      placeholder="De (Data)"
                      styles={selectStyles}
                      isClearable
                    />
                  </div>
                  <span className="filtro-block__range-sep">até</span>
                  <div className="filtro-block__range-item">
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

            {/* BLOCO: DATA VENCIMENTO */}
            <div className="filtro-block">
              <div className="filtro-block__header">
                <label className="filtro-block__label">Data Vencimento</label>
                <div className="filtro-block__btn-group">
                  <button type="button" onClick={() => alternarModo('data_venc', 'especifico')} className={`filtro-block__btn-mode ${modoDataVenc === 'especifico' ? 'filtro-block__btn-mode--active' : ''}`}>Específicos</button>
                  <button type="button" onClick={() => alternarModo('data_venc', 'lote')} className={`filtro-block__btn-mode ${modoDataVenc === 'lote' ? 'filtro-block__btn-mode--active' : ''}`}>Intervalo</button>
                </div>
              </div>
              {modoDataVenc === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.datasVenc} value={getMultiValueData(filtros.data_venc_especifica)} onChange={(opts) => handleMultiSelectChange('data_venc_especifica', opts)} placeholder="Selecionar dias..." styles={selectStyles} noOptionsMessage={() => "Nenhuma data"} />
              ) : (
                <div className="filtro-block__range-container">
                  <div className="filtro-block__range-item">
                    <Select
                      options={opcoesFiltro.datasVenc}
                      value={filtros.data_venc_inicio ? { value: filtros.data_venc_inicio, label: formatarDataParaBR(filtros.data_venc_inicio) } : null}
                      onChange={(opt) => onFiltroChange({ target: { name: 'data_venc_inicio', value: opt ? opt.value : '' } })}
                      placeholder="De (Data)"
                      styles={selectStyles}
                      isClearable
                    />
                  </div>
                  <span className="filtro-block__range-sep">até</span>
                  <div className="filtro-block__range-item">
                    <Select
                      options={opcoesFiltro.datasVenc}
                      value={filtros.data_venc_fim ? { value: filtros.data_venc_fim, label: formatarDataParaBR(filtros.data_venc_fim) } : null}
                      onChange={(opt) => onFiltroChange({ target: { name: 'data_venc_fim', value: opt ? opt.value : '' } })}
                      placeholder="Até (Data)"
                      styles={selectStyles}
                      isClearable
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 🟢 NOVO BLOCO: REGISTRADO SAP USANDO REACT-SELECT */}
            <div className="filtro-block">
              <label className="filtro-block__label filtro-block__label--block">Registrado SAP?</label>
              <Select
                options={[
                  { value: 'SIM', label: 'SIM (Já registrado)' },
                  { value: 'NÃO', label: 'NÃO (Pendente registro)' }
                ]}
                value={
                  filtros.registrado_sap
                    ? { value: filtros.registrado_sap, label: filtros.registrado_sap === 'SIM' ? 'SIM (Já registrado)' : 'NÃO (Pendente registro)' }
                    : null
                }
                onChange={(opt) => onFiltroChange({ target: { name: 'registrado_sap', value: opt ? opt.value : '' } })}
                placeholder="Todos (Ignorar SAP)"
                styles={selectStyles}
                isClearable
              />
            </div>

            {/* BLOCO: TIPO DOC */}
            <div className="filtro-block">
              <label className="filtro-block__label filtro-block__label--block">Tipo Documento</label>
              <Select isMulti options={opcoesFiltro.tiposDoc} value={getMultiValue(filtros.tipo_documento)} onChange={(opts) => handleMultiSelectChange('tipo_documento', opts)} placeholder="Ex: NFSe..." styles={selectStyles} />
            </div>

            {/* BLOCO: VALIDAÇÃO PEP */}
            <div className="filtro-block">
              <label className="filtro-block__label filtro-block__label--block">Validação PEP</label>
              <Select isMulti options={opcoesFiltro.validacoes} value={getMultiValue(filtros.validacao_pep)} onChange={(opts) => handleMultiSelectChange('validacao_pep', opts)} placeholder="Ex: OK..." styles={selectStyles} />
            </div>

          </div>
        </div>

        <div className="filtro-modal__footer">
          <div>
            {temFiltroAtivo ? (
              <button onClick={() => { onLimpar(); onClose(); }} className="filtro-modal__btn-clear">
                <XCircle size={16} /> Limpar Filtros
              </button>
            ) : <div />}
          </div>
          <button onClick={onClose} className="filtro-modal__btn-submit">
            Ver Resultados
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}