// src/componentes/Dashboard/Dashboard.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import FiltroOP from '../FiltroOP/FiltroOP';
import FiltroFat from '../FiltroFat/FiltroFat';
import BtnExcel from '../BtnExcel/BtnExcel';
import EditarLote from '../EditarLote/EditarLote';
import './Dashboard.css';
import { 
  shortId, 
  formatarDataCurta, 
  formatarMoeda, 
  matchMultiSelect, 
  matchFiltro,
  matchData
} from '../../services/utils';

// --- Ícones ---
const TableList = ({ size = 24, className = "" }) => <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="9" y2="21"/></svg>;
const ChevronLeft = ({ size = 18 }) => <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRight = ({ size = 18 }) => <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const FilterIcon = ({ size = 16 }) => <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const EditBatchIcon = ({ size = 16 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

export default function Dashboard({ atms, carregando, onOpenAtm }) {
  const valoresIniciaisFiltro = {
    id: '', solicitante: '', pedido: '', nf: '', data_inicio: '', data_fim: '', data_especifica: '', status: '', transportadora: '',
    fatura: '', elemento_pep: '', registrado_sap: '', tipo_documento: '', validacao_pep: '',
    data_map_inicio: '', data_map_fim: '', data_map_especifica: '',
    data_emissao_inicio: '', data_emissao_fim: '', data_emi_especifica: '',
    data_venc_inicio: '', data_venc_fim: '', data_venc_especifica: '' 
  };

  const [filtros, setFiltros] = useState(valoresIniciaisFiltro);
  const [abertoFiltroOp, setAbertoFiltroOp] = useState(false);
  const [abertoFiltroFat, setAbertoFiltroFat] = useState(false);
  const [abertoEdicaoLote, setAbertoEdicaoLote] = useState(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [selecionados, setSelecionados] = useState([]);
  
  const itensPorPagina = 20;
  const tableContentRef = useRef(null);

  useEffect(() => { 
    setPaginaAtual(1); 
    setSelecionados([]); 
  }, [filtros]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros(valoresIniciaisFiltro);
  };

  const handleSalvarLote = async (ids, dadosAlterados) => {
    if (Object.keys(dadosAlterados).length === 0) {
      alert("Nenhum campo foi preenchido. A edição em lote foi cancelada.");
      setAbertoEdicaoLote(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/admin/transportes/lote/editar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: ids,
          dados: dadosAlterados
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao atualizar em lote.');
      }

      alert(data.mensagem); 
      setAbertoEdicaoLote(false);
      setSelecionados([]);
      
      window.location.reload();

    } catch (error) {
      console.error("Erro na edição em lote:", error);
      alert(`Falha ao editar: ${error.message}`);
    }
  };

  const atmsFiltrados = useMemo(() => {
    return atms.filter(atm => {
      const opOk = matchFiltro(atm.numero_atm || shortId(atm.id), filtros.id) &&
                   matchFiltro(atm.pedido_compra, filtros.pedido) &&
                   matchFiltro(atm.nf, filtros.nf) &&
                   matchMultiSelect(atm.solicitacao, filtros.solicitante) &&
                   matchMultiSelect(atm.status, filtros.status) &&
                   matchMultiSelect(atm.transportadora?.nome, filtros.transportadora) &&
                   matchData(atm.data_solicitacao, filtros.data_especifica, filtros.data_inicio, filtros.data_fim);

      const fatura = atm.faturamento?.fatura_cte || atm.fatura_cte;
      const pep = atm.faturamento?.elemento_pep_cc_wbs || atm.elemento_pep_cc_wbs || atm.wbs;
      const tipoDoc = atm.faturamento?.tipo_documento || atm.tipo_documento;
      const valPep = atm.faturamento?.validacao_pep || atm.validacao_pep;
      const regSap = atm.faturamento?.registrado_sap || atm.registrado_sap;
      
      const dataMap = atm.faturamento?.data_mapeamento || atm.data_mapeamento;
      const dataEmi = atm.faturamento?.data_emissao || atm.data_emissao;
      const dataVenc = atm.faturamento?.vencimento || atm.vencimento;

      const fatOk = matchFiltro(fatura, filtros.fatura) &&
                    matchMultiSelect(pep, filtros.elemento_pep) &&
                    matchMultiSelect(tipoDoc, filtros.tipo_documento) &&
                    matchMultiSelect(valPep, filtros.validacao_pep) &&
                    (filtros.registrado_sap === '' || regSap === filtros.registrado_sap) &&
                    matchData(dataMap, filtros.data_map_especifica, filtros.data_map_inicio, filtros.data_map_fim) &&
                    matchData(dataEmi, filtros.data_emi_especifica, filtros.data_emissao_inicio, filtros.data_emissao_fim) &&
                    matchData(dataVenc, filtros.data_venc_especifica, filtros.data_venc_inicio, filtros.data_venc_fim);

      return opOk && fatOk;
    });
  }, [atms, filtros]);

  const totalPaginas = Math.ceil(atmsFiltrados.length / itensPorPagina);

  const atmsExibidos = useMemo(() => {
    return atmsFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  }, [atmsFiltrados, paginaAtual]);

  const getStatusClass = (status) => {
    const s = status?.toLowerCase();
    if (s === 'entregue') return 'badge-success';
    if (s === 'recusado' || s === 'frete morto') return 'badge-danger'; 
    if (s === 'em rota') return 'badge-info';
    return 'badge-warning';
  };

  const handleSelectRow = (id) => {
    setSelecionados(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id) 
        : [...prev, id] 
    );
  };

  const handleSelectAll = () => {
    const todosIdsPagina = atmsExibidos.map(atm => atm.id);
    const todosSelecionados = todosIdsPagina.length > 0 && todosIdsPagina.every(id => selecionados.includes(id));

    if (todosSelecionados) {
      setSelecionados(prev => prev.filter(id => !todosIdsPagina.includes(id)));
    } else {
      setSelecionados(prev => {
        const novosIds = todosIdsPagina.filter(id => !prev.includes(id));
        return [...prev, ...novosIds];
      });
    }
  };

  return (
    <section className="dashboard fade-in">

      <FiltroOP atms={atms} filtros={filtros} onFiltroChange={handleFiltroChange} onLimpar={limparFiltros} aberto={abertoFiltroOp} onClose={() => setAbertoFiltroOp(false)} />
      <FiltroFat atms={atms} filtros={filtros} onFiltroChange={handleFiltroChange} onLimpar={limparFiltros} aberto={abertoFiltroFat} onClose={() => setAbertoFiltroFat(false)} />
      
      <EditarLote 
        aberto={abertoEdicaoLote} 
        onClose={() => setAbertoEdicaoLote(false)} 
        idsSelecionados={selecionados} 
        onSalvar={handleSalvarLote} 
      />

      {selecionados.length > 0 && (
        <div className="batch-actions">
          <span className="batch-actions__info">
            <strong>{selecionados.length}</strong> item(ns) selecionado(s)
          </span>
          <div className="batch-actions__controls">
            <button 
              className="batch-actions__btn batch-actions__btn--cancel"
              onClick={() => setSelecionados([])}
            >
              Cancelar
            </button>
            <button 
              className="batch-actions__btn batch-actions__btn--primary"
              onClick={() => setAbertoEdicaoLote(true)}
            >
              <EditBatchIcon size={16} /> Editar em Lote
            </button>
          </div>
        </div>
      )}

      <div className="dashboard__table-wrapper">
        <div className="dashboard__scroll-container">
          <table className="data-table" ref={tableContentRef}>
            <thead className="data-table__head--sticky">
              <tr>
                <th colSpan="14" className="data-table__cell data-table__group-header--op">
                  <div className="data-table__group-content">
                    <span className="data-table__group-title">DADOS DA OPERAÇÃO</span>
                    <button className="header-filter-btn header-filter-btn--op" onClick={() => setAbertoFiltroOp(true)} aria-label="Abrir filtros de operação">
                      <FilterIcon size={14} /> Filtros
                    </button>
                  </div>
                </th>

                <th colSpan="9" className="data-table__cell data-table__group-header--fat">
                  <div className="data-table__group-content">
                    <span className="data-table__group-title">FATURAMENTO / SAP</span>
                    <button className="header-filter-btn header-filter-btn--fat" onClick={() => setAbertoFiltroFat(true)} aria-label="Abrir filtros de faturamento">
                      <FilterIcon size={14} /> Filtros
                    </button>
                  </div>
                </th>
              </tr>

              <tr className="data-table__row--subheader">
                <th className="data-table__cell data-table__cell--sticky-left data-table__cell--center" style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={atmsExibidos.length > 0 && atmsExibidos.every(atm => selecionados.includes(atm.id))} 
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th className="data-table__cell data-table__cell--sticky-left">ID ATM</th>
                <th className="data-table__cell">Tipo Operação</th>
                <th className="data-table__cell">Projeto / WBS</th>
                <th className="data-table__cell">Solicitante</th>
                <th className="data-table__cell">Pedido</th>
                <th className="data-table__cell">NF</th>
                <th className="data-table__cell">Transportadora</th>
                
                <th className="data-table__cell">Vlr. Previsto</th>
                <th className="data-table__cell">Vlr. NF</th>
                <th className="data-table__cell">Rota</th>
                <th className="data-table__cell">T. Frete</th>
                <th className="data-table__cell">Veículo</th>
                <th className="data-table__cell data-table__cell--border-right">Status</th>
                
                <th className="data-table__cell">Tipo Doc.</th>
                <th className="data-table__cell">Data Map.</th>
                <th className="data-table__cell">Fatura</th>
                
                <th className="data-table__cell">Vlr. Realizado</th>
                
                <th className="data-table__cell">Data Emissão</th>
                <th className="data-table__cell">Vencimento</th>
                <th className="data-table__cell">Elem. PEP</th>
                <th className="data-table__cell">Valid. PEP</th>
                <th className="data-table__cell data-table__cell--center">SAP</th>
              </tr>
            </thead>
            
            <tbody>
              {carregando ? (
                <tr><td colSpan="23" className="data-table__cell data-table__cell--empty">Carregando dados mestre...</td></tr>
              ) : atmsExibidos.length === 0 ? (
                <tr><td colSpan="23" className="data-table__cell data-table__cell--empty">Nenhum resultado encontrado.</td></tr>
              ) : atmsExibidos.map((atm) => {
                
                const isRecusado = atm.status?.toLowerCase() === 'recusado';
                const isSelected = selecionados.includes(atm.id);

                return (
                  <tr 
                    key={atm.id} 
                    className={`data-table__row ${isRecusado ? 'data-table__row--rejected' : ''} ${isSelected ? 'data-table__row--selected' : ''}`} 
                    onDoubleClick={() => onOpenAtm(atm)} 
                    title="Duplo clique para abrir detalhes"
                  >
                    <td 
                      className="data-table__cell data-table__cell--id data-table__cell--center" 
                      onClick={(e) => e.stopPropagation()}
                    >
                       <input 
                         type="checkbox" 
                         checked={isSelected} 
                         onChange={() => handleSelectRow(atm.id)} 
                         style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                       />
                    </td>
                    <td className="data-table__cell data-table__cell--id">#{atm.numero_atm || shortId(atm.id)}</td>
                    <td className="data-table__cell">{atm.tipo_operacao || '-'}</td>
                    <td className="data-table__cell">{atm.wbs || '-'}</td>
                    <td className="data-table__cell">{atm.solicitacao || '-'}</td>
                    <td className="data-table__cell">{atm.pedido_compra || '-'}</td>
                    <td className="data-table__cell">{atm.nf || '-'}</td>
                    <td className="data-table__cell data-table__cell--fw-600">{atm.transportadora?.nome || 'A DEFINIR'}</td>
                    
                    <td className="data-table__cell data-table__cell--fw-bold">
                      {formatarMoeda(
                        (Array.isArray(atm.faturamento) ? atm.faturamento[0]?.valor_previsto : atm.faturamento?.valor_previsto) 
                        || atm.valor_previsto 
                        || 0
                      )}
                    </td>
                    
                    <td className="data-table__cell data-table__cell--fw-bold" style={{ color: '#0057A8' }}>
                      {formatarMoeda(atm.valor_nf || 0)}
                    </td>

                    <td className="data-table__cell data-table__cell--route">
                      <span>De:</span> {atm.origem?.municipio}<br/>
                      <span>Para:</span> {atm.destino?.municipio}
                    </td>
                    <td className="data-table__cell"><small>{atm.tipo_frete || '-'}</small></td>
                    <td className="data-table__cell">{atm.veiculo || '-'}</td>
                    <td className="data-table__cell data-table__cell--border-right">
                      <span className={`badge ${getStatusClass(atm.status)}`}>{atm.status}</span>
                    </td>
                    
                    <td className="data-table__cell">{atm.faturamento?.tipo_documento || '-'}</td>
                    <td className="data-table__cell"><small>{formatarDataCurta(atm.faturamento?.data_mapeamento)}</small></td>
                    <td className="data-table__cell data-table__cell--fatura">{atm.faturamento?.fatura_cte || '-'}</td>
                    
                    <td className="data-table__cell data-table__cell--valor">
                      {formatarMoeda(atm.valor_realizado || 0)}
                    </td>
                    
                    <td className="data-table__cell">{formatarDataCurta(atm.faturamento?.data_emissao)}</td>
                    <td className="data-table__cell"><strong className="data-table__cell--vencimento">{formatarDataCurta(atm.faturamento?.vencimento)}</strong></td>
                    <td className="data-table__cell"><small>{atm.faturamento?.elemento_pep_cc_wbs || '-'}</small></td>
                    <td className="data-table__cell">{atm.faturamento?.validacao_pep || '-'}</td>
                    <td className="data-table__cell data-table__cell--center">{atm.faturamento?.registrado_sap || 'NÃO'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!carregando && atmsFiltrados.length > 0 && (
          <div className="pagination">
            <div className="pagination__info">
              Mostrando <strong>{((paginaAtual - 1) * itensPorPagina) + 1}</strong> até <strong>{Math.min(paginaAtual * itensPorPagina, atmsFiltrados.length)}</strong> de <strong>{atmsFiltrados.length}</strong> registros
            </div>
            <BtnExcel atmsFiltrados={atmsFiltrados} />
            <div className="pagination__controls">
              <button className="pagination__btn" onClick={() => setPaginaAtual(p => Math.max(p-1, 1))} disabled={paginaAtual === 1} aria-label="Página anterior"><ChevronLeft /> Anterior</button>
              <span className="pagination__text">{paginaAtual} / {totalPaginas}</span>
              <button className="pagination__btn" onClick={() => setPaginaAtual(p => Math.min(p+1, totalPaginas))} disabled={paginaAtual === totalPaginas} aria-label="Próxima página">Próxima <ChevronRight /></button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}