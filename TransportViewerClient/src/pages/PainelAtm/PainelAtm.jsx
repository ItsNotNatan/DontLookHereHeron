// src/pages/PainelAtm/PainelAtm.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './PainelAtm.css';
import api from '../../services/api'; 
import BtnExcel from '../../components/BtnExcel/BtnExcel';
import SearchBar from '../../components/SearchBar/SearchBar';
import FiltroAtm from '../../components/FiltroATM/FiltroAtm';

// 🟢 1. IMPORTA O SOCKET
import { io } from 'socket.io-client';

// 🟢 2. CONFIGURA A URL DO SOCKET
const SOCKET_URL = `http://${window.location.hostname}:3001`;
const socket = io(SOCKET_URL);

// --- Ícones SVG embutidos ---
const FolderOpen = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>
);
const X = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const FilterIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const ArrowRight = ({ size = 14, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);
const ExternalLink = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;
const Check = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

// 🟢 NOVOS ÍCONES PARA OS ARQUIVOS
const FileText = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const Download = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;

export default function PainelAtm() {
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [atms, setAtms] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [linkRastreio, setLinkRastreio] = useState('');
  const [salvandoLink, setSalvandoLink] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [filtros, setFiltros] = useState({
    status: '', solicitante: '', veiculo: '', transportadora: ''
  });

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 12;

  useEffect(() => {
    buscarPedidos();

    socket.on('transportes_atualizados', () => {
      buscarPedidos();
    });

    return () => {
      socket.off('transportes_atualizados');
    };
  }, []);

  useEffect(() => {
    setPaginaAtual(1);
  }, [termoBusca, filtros]);

  useEffect(() => {
    if (selectedAtm) {
      setLinkRastreio(selectedAtm.link_rastreio || '');
    }
  }, [selectedAtm]);

  const buscarPedidos = async () => {
    if (atms.length === 0) setCarregando(true);
    try {
      const resposta = await api.get('/admin/transportes'); 
      setAtms(Array.isArray(resposta.data) ? resposta.data : []);
    } catch (erro) {
      console.error("Erro detalhado:", erro.response || erro);
      setAtms([]);
    } finally {
      setCarregando(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({ status: '', solicitante: '', veiculo: '', transportadora: '' });
  };

  const atmsSeguros = Array.isArray(atms) ? atms : [];

  const atmsFiltrados = atmsSeguros.filter((atm) => {
    if (filtros.status && !filtros.status.split(',').includes(atm.status)) return false;
    if (filtros.solicitante && !filtros.solicitante.split(',').includes(atm.solicitacao)) return false;
    if (filtros.veiculo && !filtros.veiculo.split(',').includes(atm.veiculo)) return false;
    if (filtros.transportadora && !filtros.transportadora.split(',').includes(atm.transportadora?.nome)) return false;

    if (termoBusca) {
      const buscaTratada = termoBusca.toLowerCase();
      const textoDoAtm = `
        ${atm.id || ''} 
        ${atm.numero_atm || ''} 
        ${atm.solicitacao || ''} 
        ${atm.pedido_compra || ''} 
        ${atm.nf || ''} 
        ${atm.wbs || ''} 
        ${atm.veiculo || ''} 
        ${atm.status || ''} 
        ${atm.motivo || ''} 
        ${atm.transportadora?.nome || ''} 
        ${atm.origem?.municipio || ''} 
        ${atm.origem?.nome_local || ''}
        ${atm.origem?.uf || ''} 
        ${atm.destino?.municipio || ''}
        ${atm.destino?.nome_local || ''}
        ${atm.destino?.uf || ''}
      `.toLowerCase();
      if (!textoDoAtm.includes(buscaTratada)) return false;
    }
    return true; 
  });

  const totalPaginas = Math.ceil(atmsFiltrados.length / itensPorPagina);
  const indiceUltimoItem = paginaAtual * itensPorPagina;
  const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
  const atmsExibidos = atmsFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);

  const getStatusClass = (status) => {
    if (status === 'Entregue') return 'painel-badge--success';
    if (status === 'Aguardando Aprovação') return 'painel-badge--warning';
    if (status === 'Recusado' || status === 'Frete morto') return 'painel-badge--danger';
    return 'painel-badge--info';
  };

  const shortId = (id) => id ? id.substring(0, 8).toUpperCase() : 'N/A';

  const formatarData = (dataStr) => {
    if (!dataStr) return 'Não informada';
    const dataLimpa = dataStr.split('T')[0];
    const partes = dataLimpa.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return '-';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const renderDesvioCusto = (atm) => {
    const previstoRaw = atm.faturamento?.valor_previsto;
    const realizadoRaw = atm.valor_realizado;

    if (!previstoRaw && !realizadoRaw && previstoRaw !== 0 && realizadoRaw !== 0) {
      return (
        <span className="led-status led-cinza" title="Nenhum valor financeiro informado"></span>
      );
    }

    const previsto = Number(previstoRaw || 0);
    const realizado = Number(realizadoRaw || 0);
    
    const isOverBudget = realizado > previsto;
    const ledClass = isOverBudget ? 'led-vermelho' : 'led-verde';
    
    const tooltipText = `Previsto: ${formatarMoeda(previsto)} | Realizado: ${formatarMoeda(realizado)}`;

    return (
      <span className={`led-status ${ledClass}`} title={tooltipText}></span>
    );
  };

  // 🟢 FUNÇÃO AUXILIAR PARA MONTAR O LINK DOS ARQUIVOS (POCKETBASE)
  const obterLinkArquivo = (arquivo) => {
    if (arquivo.startsWith('http')) return arquivo;
    const baseUrl = api.defaults.baseURL || `http://${window.location.hostname}:8090`;
    return `${baseUrl}/api/files/pedidos_atm/${selectedAtm.id}/${arquivo}`;
  };

  // 🟢 FUNÇÃO PARA GARANTIR QUE OS COMPROVANTES SÃO UMA LISTA (ARRAY)
  const obterListaComprovantes = () => {
    if (!selectedAtm || !selectedAtm.comprovantes) return [];
    if (Array.isArray(selectedAtm.comprovantes)) {
      return selectedAtm.comprovantes;
    }
    try {
      return JSON.parse(selectedAtm.comprovantes);
    } catch (e) {
      return [selectedAtm.comprovantes];
    }
  };

  const listaArquivos = obterListaComprovantes();

  return (
    <>
      <section className="painel-atm u-fade-in">
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <SearchBar termoBusca={termoBusca} setTermoBusca={setTermoBusca} placeholder="Buscar por ID, cidade, status..." />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="painel-btn painel-btn--secondary" 
              onClick={() => setFiltroAberto(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1' }}
            >
              <FilterIcon size={16} /> Filtros Avançados
              {Object.values(filtros).some(v => v !== '') && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', marginLeft: '4px' }}></span>
              )}
            </button>
            <BtnExcel atmsFiltrados={atmsFiltrados} />
          </div>
        </div>

        <div className="painel-table-wrapper">
          <table className="painel-table" style={{ fontSize: '0.8rem' }}>
            <thead className="painel-table__head">
              <tr>
                <th className="painel-table__header-cell">ID ATM</th>
                <th className="painel-table__header-cell">Solicitante</th>
                <th className="painel-table__header-cell">Nº do Pedido</th>
                <th className="painel-table__header-cell">Nome do Projeto</th>
                <th className="painel-table__header-cell">Rota (Remetente ➔ Destinatário)</th>
                <th className="painel-table__header-cell">Veículo</th>
                <th className="painel-table__header-cell">Transportadora</th>
                <th className="painel-table__header-cell painel-table__header-cell--center">Desvio de Custo</th>
                <th className="painel-table__header-cell">Status</th>
                <th className="painel-table__header-cell painel-table__header-cell--center">Rastreio</th>
                <th className="painel-table__header-cell painel-table__header-cell--center">Ações</th>
              </tr>
            </thead>
            
            <tbody>
              {carregando ? (
                <tr><td colSpan="11" className="painel-table__cell--empty">Carregando seus pedidos...</td></tr>
              ) : atmsExibidos.length === 0 ? (
                <tr><td colSpan="11" className="painel-table__cell--empty">Nenhum pedido encontrado com estes filtros.</td></tr>
              ) : atmsExibidos.map((atm) => {
                
                // 🟢 IDENTIFICA SE O FRETE ESTÁ RECUSADO E APLICA A CLASSE NO TR
                const isRecusado = atm.status?.toLowerCase() === 'recusado';

                return (
                  <tr 
                    key={atm.id} 
                    className={`painel-table__row ${isRecusado ? 'painel-table__row--rejected' : ''}`}
                  >
                    <td className="painel-table__cell painel-table__cell--bold" title={atm.id}>#{atm.numero_atm || shortId(atm.id)}</td>
                    <td className="painel-table__cell">{atm.solicitacao || '-'}</td>
                    <td className="painel-table__cell">{atm.pedido_compra || '-'}</td>
                    <td className="painel-table__cell">{atm.wbs || '-'}</td>
                    
                    <td className="painel-table__cell painel-table__route">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '140px' }}>
                          <strong style={{ fontSize: '0.8rem', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={atm.origem?.nome_local}>
                            {atm.origem?.nome_local || 'Origem N/A'}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={atm.origem?.municipio}>
                            {atm.origem?.municipio || '-'}
                          </span>
                        </div>
                        <ArrowRight size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '140px' }}>
                          <strong style={{ fontSize: '0.8rem', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={atm.destino?.nome_local}>
                            {atm.destino?.nome_local || 'Destino N/A'}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={atm.destino?.municipio}>
                            {atm.destino?.municipio || '-'}
                          </span>
                        </div>
                      </div>
                    </td>
      
                    <td className="painel-table__cell">{atm.veiculo}</td>
                    <td className="painel-table__cell painel-table__cell--medium">
                      {atm.transportadora?.nome || <span className="painel-table__cell--muted">A Definir</span>}
                    </td>
                    
                    <td className="painel-table__cell painel-table__cell--center">
                      {renderDesvioCusto(atm)}
                    </td>
                    
                    <td className="painel-table__cell">
                      <span className={`painel-badge ${getStatusClass(atm.status)}`}>{atm.status}</span>
                    </td>

                    <td className="painel-table__cell painel-table__cell--center">
                      {atm.link_rastreio ? (
                        <a 
                          href={atm.link_rastreio} target="_blank" rel="noopener noreferrer" className="painel-btn"
                          style={{ color: '#2563eb', display: 'inline-flex', padding: '4px', borderRadius: '4px', transition: 'transform 0.2s' }}
                          title="Link de rastreio disponível! Clique para abrir."
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <ExternalLink size={18} />
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1', display: 'inline-flex', padding: '4px', cursor: 'not-allowed' }} title="Nenhum link de rastreio anexado pela operação.">
                          <ExternalLink size={18} />
                        </span>
                      )}
                    </td>

                    <td className="painel-table__cell painel-table__cell--center">
                      <button className="painel-btn painel-btn--action" onClick={() => setSelectedAtm(atm)}>
                        <FolderOpen size={16} /> Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!carregando && totalPaginas > 1 && (
            <div className="painel-pagination">
              <span className="painel-pagination__info">
                Mostrando <strong>{indicePrimeiroItem + 1}</strong> a <strong>{Math.min(indiceUltimoItem, atmsFiltrados.length)}</strong> de <strong>{atmsFiltrados.length}</strong> resultados
              </span>
              <div className="painel-pagination__controls">
                <button 
                  className="painel-pagination__btn" onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))} disabled={paginaAtual === 1}>
                  Anterior
                </button>
                <span className="painel-pagination__current">Página {paginaAtual} de {totalPaginas}</span>
                <button 
                  className="painel-pagination__btn" onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas}>
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <FiltroAtm atms={atms} filtros={filtros} onFiltroChange={handleFiltroChange} onLimpar={limparFiltros} aberto={filtroAberto} onClose={() => setFiltroAberto(false)} />

      {selectedAtm && createPortal(
        <div className="painel-modal__overlay">
          <div className="painel-modal__content u-fade-in">
            <div className="painel-modal__header">
              <div>
                <span className="painel-modal__subtitle">Ficha Cadastral Completa</span>
                <h2 className="painel-modal__title">ATM #{selectedAtm.numero_atm || shortId(selectedAtm.id)}</h2>
              </div>
              <button className="painel-btn painel-btn--close" onClick={() => setSelectedAtm(null)}><X size={24} /></button>
            </div>
            
            <div className="painel-modal__body">
              <div className="painel-modal__grid">
                
                <div className="painel-modal__section">
                  <h4>Identificação</h4>
                  <ul className="painel-modal__list">
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Solicitante:</span> <span className="painel-modal__value">{selectedAtm.solicitacao || 'Não informado'}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Nº do Pedido:</span> <span className="painel-modal__value">{selectedAtm.pedido_compra || 'Não informado'}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Nota Fiscal:</span> <span className="painel-modal__value">{selectedAtm.nf || 'Não informado'}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Valor da NF:</span> <span className="painel-modal__value">{formatarMoeda(selectedAtm.valor_nf)}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Centro de Custo (WBS):</span> <span className="painel-modal__value">{selectedAtm.wbs || 'Não informado'}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Data da Solicitação:</span> <span className="painel-modal__value">{formatarData(selectedAtm.data_solicitacao || selectedAtm.created_at)}</span></li>
                  </ul>
                </div>

                <div className="painel-modal__section">
                  <h4>Carga e Logística</h4>
                  <ul className="painel-modal__list">
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Transportadora:</span> <span className="painel-modal__value">{selectedAtm.transportadora?.nome || 'A Definir'}</span></li>
                    
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Valor Previsto:</span> <span className="painel-modal__value painel-modal__value--success">{formatarMoeda(selectedAtm.faturamento?.valor_previsto)}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Valor Realizado:</span> <span className="painel-modal__value">{formatarMoeda(selectedAtm.valor_realizado)}</span></li>
                    
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Tipo de Veículo:</span> <span className="painel-modal__value">{selectedAtm.veiculo || 'Não informado'}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Tipo de Frete:</span> <span className="painel-modal__value">{selectedAtm.tipo_frete || 'Não informado'}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Peso Estimado:</span> <span className="painel-modal__value">{selectedAtm.peso ? `${selectedAtm.peso} kg` : 'Não informado'}</span></li>
                    <li className="painel-modal__list-item"><span className="painel-modal__label">Volume Total:</span> <span className="painel-modal__value">{selectedAtm.volume ? `${selectedAtm.volume} m³` : 'Não informado'}</span></li>
                  </ul>
                </div>

                <div className="painel-modal__section" style={{ gridColumn: 'span 2' }}>
                  <h4>Detalhes da Rota e Rastreamento</h4>
                  <ul className="painel-modal__list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <li className="painel-modal__list-item">
                      <span className="painel-modal__label">Origem:</span> 
                      <span className="painel-modal__value painel-modal__value--block">
                        {selectedAtm.origem?.nome_local || 'N/A'}<br/>
                        <span className="painel-modal__sub-text">{selectedAtm.origem?.municipio} - {selectedAtm.origem?.uf}</span>
                      </span>
                    </li>
                    <li className="painel-modal__list-item">
                      <span className="painel-modal__label">Destino:</span> 
                      <span className="painel-modal__value painel-modal__value--block">
                        {selectedAtm.destino?.nome_local || 'N/A'}<br/>
                        <span className="painel-modal__sub-text">{selectedAtm.destino?.municipio} - {selectedAtm.destino?.uf}</span>
                      </span>
                    </li>
                  </ul>

                  <div className="painel-modal__tracking-box">
                    {selectedAtm.link_rastreio ? (
                      <a href={selectedAtm.link_rastreio} target="_blank" rel="noopener noreferrer" className="painel-btn painel-btn--track-active" title="Abrir o link de acompanhamento no navegador">
                        <ExternalLink size={18} /> Acompanhar Transporte
                      </a>
                    ) : (
                      <button className="painel-btn painel-btn--track-disabled" disabled title="O link de rastreio ainda não foi disponibilizado pela operação.">
                        <ExternalLink size={18} /> Rastreio Indisponível
                      </button>
                    )}
                  </div>
                </div>

                <div className="painel-modal__section" style={{ gridColumn: 'span 2' }}>
                  <h4>Status, Motivos e Observações</h4>
                  <ul className="painel-modal__list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <li className="painel-modal__list-item" style={{ borderBottom: 'none' }}><span className="painel-modal__label">Status Atual:</span> <span className={`painel-badge ${getStatusClass(selectedAtm.status)}`}>{selectedAtm.status}</span></li>
                    <li className="painel-modal__list-item" style={{ borderBottom: 'none' }}><span className="painel-modal__label">Motivo (Divergência):</span> <span className="painel-modal__value" style={{ color: selectedAtm.motivo ? '#dc2626' : '#6b7280', fontWeight: selectedAtm.motivo ? 'bold' : 'normal' }}>{selectedAtm.motivo || 'Nenhum motivo registrado'}</span></li>
                  </ul>
                  
                  <div className="painel-modal__obs-box">
                    <span className="painel-modal__obs-title">Observações do Pedido:</span>
                    <p className="painel-modal__obs-text">{selectedAtm.observacoes || 'Nenhuma observação registrada pelo solicitante para este pedido.'}</p>
                  </div>
                </div>

                {/* 🟢 NOVA SEÇÃO: ARQUIVOS E COMPROVANTES (Apenas Visualização) */}
                <div className="painel-modal__section" style={{ gridColumn: 'span 2' }}>
                  <h4>Arquivos e Comprovantes</h4>
                  
                  {listaArquivos.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
                      {listaArquivos.map((arquivo, index) => {
                        const nomeExibicao = typeof arquivo === 'string' ? arquivo : (arquivo.name || `Anexo ${index + 1}`);
                        const urlArquivo = typeof arquivo === 'string' ? obterLinkArquivo(arquivo) : (arquivo.url || obterLinkArquivo(arquivo.name));

                        return (
                          <a 
                            key={index} 
                            href={urlArquivo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', 
                              backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', 
                              color: '#334155', textDecoration: 'none', transition: 'all 0.2s', fontSize: '0.85rem'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                          >
                            <FileText size={18} style={{ color: '#0057A8' }} />
                            <span style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeExibicao}>
                              {nomeExibicao}
                            </span>
                            <Download size={16} style={{ color: '#64748b', marginLeft: '4px' }} />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="painel-modal__obs-box" style={{ backgroundColor: 'transparent', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                      <p className="painel-modal__obs-text">Nenhum arquivo ou comprovante anexado a este pedido no momento.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="painel-modal__footer">
              <button className="painel-btn painel-btn--secondary" onClick={() => setSelectedAtm(null)}>Fechar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
