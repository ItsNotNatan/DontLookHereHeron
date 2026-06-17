// src/componentes/CardExpandido/CardExpandido.jsx
import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select'; 
import CardEditavel from '../CardEditavel/CardEditavel';
import BtnPdf from '../BtnPdf/BtnPdf';
import api from '../../services/api';
import './CardExpandido.css';

// --- Ícones SVG ---
const X = ({ size = 24 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const EditIcon = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const FileText = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const UploadCloud = ({ size = 24 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /><polyline points="16 16 12 12 8 16" /></svg>;
const ExternalLink = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;
const Check = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const AlertCircle = ({ size = 18, color = "#ef4444" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const Trash2 = ({ size = 18 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

export default function CardExpandido({ atm, onClose, onAtmUpdated }) {
  const [modoEdicao, setModoEdicao] = useState(false);

  const [linkRastreio, setLinkRastreio] = useState('');
  const [motivoSelecionado, setMotivoSelecionado] = useState(''); 
  const [salvandoLink, setSalvandoLink] = useState(false);
  const [motivosDisponiveis, setMotivosDisponiveis] = useState([]);

  // Estados dos Anexos e Drag & Drop
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (atm) {
      setLinkRastreio(atm.link_rastreio || '');
      setMotivoSelecionado(atm.motivo || '');
    }
  }, [atm]);

  useEffect(() => {
    const fetchMotivos = async () => {
      try {
        const response = await api.get('/admin/motivos');
        setMotivosDisponiveis(response.data);
      } catch (e) {
        console.error("Erro ao buscar motivos", e);
      }
    };
    fetchMotivos();
  }, []);

  if (!atm) return null;

  // --- LÓGICA DE DADOS SEGUROS ---
  const gerarPayloadSeguro = (novosDados) => {
    const dadosPreparados = { ...novosDados };
    // Garante que Arrays virem String (JSON) antes de ir para o backend
    if (dadosPreparados.comprovantes && typeof dadosPreparados.comprovantes !== 'string') {
      dadosPreparados.comprovantes = JSON.stringify(dadosPreparados.comprovantes);
    }
    if (dadosPreparados.lista_cargas && typeof dadosPreparados.lista_cargas !== 'string') {
      dadosPreparados.lista_cargas = JSON.stringify(dadosPreparados.lista_cargas);
    }

    // Função interna para transformar tudo em moeda padrão
    const formatarMoeda = (valor) => {
      const numero = Number(valor);
      if (Number.isNaN(numero)) return 'R$ 0,00';
      return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return {
      status: atm.status,
      tipo_operacao: atm.tipo_operacao,
      solicitacao: atm.solicitacao,
      data_solicitacao: atm.data_solicitacao,
      pedido_compra: atm.pedido_compra,
      numero_reserva: atm.numero_reserva,
      wbs: atm.wbs,
      nf: atm.nf,
      valor_nf: atm.valor_nf,
      // 🟢 CORREÇÃO APLICADA: Usando valor_previsto
      valor_previsto: atm.faturamento?.valor_previsto || atm.valor_previsto,
      cotacao_bid: atm.cotacao_bid,
      veiculo: atm.veiculo,
      tipo_frete: atm.tipo_frete,
      peso: atm.peso,
      volume: atm.volume,
      medidas: atm.medidas,
      link_rastreio: atm.link_rastreio,
      motivo: atm.motivo,
      observacoes: atm.observacoes,
      data_coleta: atm.data_coleta,
      contato_coleta: atm.contato_coleta,
      telefone_coleta: atm.telefone_coleta,
      origem: atm.origem,
      data_entrega: atm.data_entrega,
      contato_entrega: atm.contato_entrega,
      telefone_entrega: atm.telefone_entrega,
      destino: atm.destino,
      tipo_documento: atm.faturamento?.tipo_documento,
      data_mapeamento: atm.faturamento?.data_mapeamento,
      fatura_cte: atm.faturamento?.fatura_cte,
      data_emissao: atm.faturamento?.data_emissao,
      vencimento: atm.faturamento?.vencimento,
      validacao_pep: atm.faturamento?.validacao_pep,
      registrado_sap: atm.faturamento?.registrado_sap,
      
      lista_cargas: typeof atm.lista_cargas === 'string' ? atm.lista_cargas : JSON.stringify(atm.lista_cargas || []),
      comprovantes: typeof atm.comprovantes === 'string' ? atm.comprovantes : JSON.stringify(atm.comprovantes || []),
      
      ...dadosPreparados
    };
  };

  // Parsing das listas do Banco de Dados
  let listaCargasArray = [];
  let comprovantesSalvos = [];
  try {
    if (atm.lista_cargas) listaCargasArray = typeof atm.lista_cargas === 'string' ? JSON.parse(atm.lista_cargas) : atm.lista_cargas;
    if (atm.comprovantes) comprovantesSalvos = typeof atm.comprovantes === 'string' ? JSON.parse(atm.comprovantes) : atm.comprovantes;
  } catch (e) {
    console.error("Erro no Parse JSON", e);
  }

  const shortId = (id) => id ? id.substring(0, 8).toUpperCase() : 'N/A';
  const formatarData = (dataStr) => {
    if (!dataStr) return 'Não informada';
    const partes = dataStr.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  const formatarMoeda = (valor) => {
    const numero = Number(valor);
    if (Number.isNaN(numero)) return 'R$ 0,00';
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const lidarComSalvar = () => {
    setModoEdicao(false);
    if (onAtmUpdated) onAtmUpdated();
  };

  const lidarComSalvarAcompanhamento = async () => {
    setSalvandoLink(true);
    try {
      const payloadSeguro = gerarPayloadSeguro({ link_rastreio: linkRastreio, motivo: motivoSelecionado });
      await api.put(`/admin/transportes/${atm.id}`, payloadSeguro);
      alert("✅ Acompanhamento atualizado com sucesso!");
      if (onAtmUpdated) onAtmUpdated(); 
    } catch (erro) {
      console.error(erro);
      alert("❌ Erro ao salvar o acompanhamento.");
    } finally {
      setSalvandoLink(false);
    }
  };

  const tiposPermitidos = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/jpg'
  ];

  const arquivoParaBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const processarArquivos = async (arquivos) => {
    const arquivosValidos = arquivos.filter(arquivo => tiposPermitidos.includes(arquivo.type));

    if (arquivosValidos.length < arquivos.length) {
      alert('⚠️ Alguns ficheiros foram ignorados. Apenas PDF, Word e Imagens são permitidos.');
    }

    if (arquivosValidos.length === 0) return;

    setIsUploading(true);
    let novosComprovantes = [...comprovantesSalvos];
    let envioComSucesso = false;

    for (let arquivo of arquivosValidos) {
      try {
        const base64 = await arquivoParaBase64(arquivo);
        const res = await api.post('/admin/drive/upload', {
          arquivoBase64: base64,
          nomeArquivo: `ATM_${atm.numero_atm || shortId(atm.id)}_${arquivo.name}`
        });
        
        if (res.data && res.data.link) {
          novosComprovantes.push({
            nome: arquivo.name,
            url: res.data.link,
            tamanho: arquivo.size
          });
          envioComSucesso = true;
        }
      } catch (erroDrive) {
        console.error(`Erro ao subir o arquivo ${arquivo.name}:`, erroDrive);
        alert(`❌ Falha ao enviar o arquivo ${arquivo.name} para a nuvem.`);
      }
    }

    if (envioComSucesso) {
      try {
        const payloadSeguro = gerarPayloadSeguro({ 
          status: 'Entregue', 
          comprovantes: novosComprovantes 
        });

        await api.put(`/admin/transportes/${atm.id}`, payloadSeguro);
        alert("📦 Documentos guardados no Banco de Dados e Status alterado para 'Entregue'!");
        if (onAtmUpdated) onAtmUpdated();
      } catch (erroDb) {
        console.error("Erro ao salvar arquivos no banco de dados:", erroDb);
        alert("❌ Erro ao vincular arquivos com o banco de dados.");
      }
    }
    
    setIsUploading(false);
  };

  const removerAnexoSalvo = async (indexParaRemover) => {
    const confirmar = window.confirm("Deseja realmente remover este arquivo permanentemente do pedido?");
    if (!confirmar) return;

    const novaLista = comprovantesSalvos.filter((_, idx) => idx !== indexParaRemover);
    
    try {
      const payloadSeguro = gerarPayloadSeguro({ comprovantes: novaLista });
      await api.put(`/admin/transportes/${atm.id}`, payloadSeguro);
      if (onAtmUpdated) onAtmUpdated();
    } catch (erro) {
      console.error("Erro ao remover arquivo:", erro);
      alert("❌ Erro ao remover o anexo.");
    }
  };

  const lidarComMudancaArquivo = (event) => {
    const arquivosSelecionados = Array.from(event.target.files);
    processarArquivos(arquivosSelecionados);
    event.target.value = null;
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const arquivosSoltos = Array.from(e.dataTransfer.files);
    processarArquivos(arquivosSoltos);
  };

  const lidarComCliqueAnexar = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const motivoCompleto = atm.motivo ? motivosDisponiveis.find(m => m.nome === atm.motivo) : null;
  const opcoesMotivos = motivosDisponiveis.map(m => ({ value: m.nome, label: m.nome, color: m.cor, description: m.descricao }));

  const formatarMotivoOption = ({ label, color, description }, { context }) => {
    if (context === 'value') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color || '#cbd5e1' }}></div>
          <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{label}</strong>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color || '#cbd5e1' }}></div>
          <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{label}</strong>
        </div>
        {description && <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '20px', lineHeight: 1.3 }}>{description}</span>}
      </div>
    );
  };
  
  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: '6px', minHeight: '44px',
      borderColor: state.isFocused ? '#2563eb' : '#cbd5e1',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
      '&:hover': { borderColor: '#2563eb' }
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
      cursor: 'pointer', padding: '8px 12px'
    }),
    menu: (base) => ({ ...base, zIndex: 9999 })
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in" style={{ maxWidth: '1000px' }}>

        <div className="modal-header">
          <div>
            <span className="modal-subtitle">{modoEdicao ? 'Editando Informações' : 'Ficha Cadastral Logística Detalhada'}</span>
            <h2 className="modal-title">ATM #{atm.numero_atm || shortId(atm.id)}</h2>
          </div>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>

        {modoEdicao ? (
          <CardEditavel atm={atm} onCancelar={() => setModoEdicao(false)} onSalvar={lidarComSalvar} />
        ) : (
          <>
            <div className="card-expandido__body">
              <div className="card-expandido__grid">

                {/* 1. IDENTIFICAÇÃO */}
                <div>
                  <h4 className="card-expandido__section-title">Identificação do Pedido</h4>
                  <ul className="card-expandido__list">
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Solicitante:</span> <strong className="card-expandido__value">{atm.solicitacao || 'Não informado'}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">ID do Sistema:</span> <strong className="card-expandido__value">{atm.id}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Data Solicitação:</span> <strong className="card-expandido__value">{formatarData(atm.data_solicitacao || atm.created_at?.split('T')[0])}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Pedido de Compra:</span> <strong className="card-expandido__value">{atm.pedido_compra || 'Não informado'}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Nota Fiscal:</span> <strong className="card-expandido__value">{atm.nf || 'Não informado'}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Valor da NF:</span> <strong className="card-expandido__value">{formatarMoeda(atm.valor_nf)}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">WBS / C. Custo:</span> <strong className="card-expandido__value">{atm.wbs || 'Não informado'}</strong></li>
                  </ul>
                </div>

                {/* 2. CARGA E TRANSPORTE */}
                <div>
                  <h4 className="card-expandido__section-title">Características da Carga</h4>
                  <ul className="card-expandido__list">
                    
                    {/* 🟢 CORREÇÃO APLICADA AQUI NO RENDER DO TEXTO */}
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Valor Previsto:</span> <strong className="card-expandido__value">{formatarMoeda(atm.faturamento?.valor_previsto || 0)}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Valor Realizado:</span> <strong className="card-expandido__value">{formatarMoeda(atm.valor_realizado || 0)}</strong></li>
                    
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Peso Estimado:</span> <strong className="card-expandido__value">{atm.peso ? `${atm.peso} kg` : 'Não informado'}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Volume:</span> <strong className="card-expandido__value">{atm.volume ? `${atm.volume} m³` : 'Não informado'}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Veículo:</span> <strong className="card-expandido__value">{atm.veiculo || 'Não informado'}</strong></li>
                    <li className="card-expandido__list-item"><span className="card-expandido__label">Transportadora:</span> <strong className="card-expandido__value">{atm.transportadora?.nome || 'A Definir'}</strong></li>
                  </ul>
                </div>

                {/* 2.1 LISTA DE ITENS DA CARGA DETALHADA */}
                {listaCargasArray.length > 0 && (
                  <div className="card-expandido__full-width">
                    <h4 className="card-expandido__section-title" style={{ marginTop: '0.5rem' }}>Itens Detalhados da Carga</h4>
                    <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '10px 12px', width: '30px' }}>Cor</th>
                            <th style={{ padding: '10px 12px' }}>Qtd</th>
                            <th style={{ padding: '10px 12px' }}>Descrição</th>
                            <th style={{ padding: '10px 12px' }}>Peso Unit.</th>
                            <th style={{ padding: '10px 12px' }}>Dimensões (CxLxA)</th>
                            <th style={{ padding: '10px 12px' }}>Peso Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listaCargasArray.map((item, index) => {
                            const qtd = parseInt(item.quantidade) || 1;
                            const peso = parseFloat(item.peso) || 0;
                            return (
                              <tr key={item.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ width: '18px', height: '18px', borderRadius: '3px', backgroundColor: item.cor || '#ccc', border: '1px solid rgba(0,0,0,0.1)' }}></div>
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>x{qtd}</td>
                                <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.nome}</td>
                                <td style={{ padding: '10px 12px', color: '#64748b' }}>{peso.toFixed(2)} kg</td>
                                <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.comprimento ? `${item.comprimento}x${item.largura}x${item.altura}m` : '-'}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#334155' }}>{(qtd * peso).toFixed(2)} kg</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', color: '#0f172a' }}>
                          <tr>
                            <td colSpan="5" style={{ padding: '10px 12px', textAlign: 'right' }}>PESO TOTAL DOS ITENS:</td>
                            <td style={{ padding: '10px 12px' }}>
                              {listaCargasArray.reduce((acc, curr) => acc + ((parseFloat(curr.peso) || 0) * (parseInt(curr.quantidade) || 1)), 0).toFixed(2)} kg
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. ORIGEM E DESTINO */}
                <div className="card-expandido__full-width">
                  <h4 className="card-expandido__section-title">Rota Detalhada e Rastreamento</h4>
                  <div className="card-expandido__route-grid">
                    {/* ORIGEM */}
                    <div className="card-expandido__route-card">
                      <span className="card-expandido__route-tag">Origem (Coleta)</span>
                      <strong className="card-expandido__route-name">{atm.origem?.nome_local || 'Fornecedor não especificado'}</strong>
                      <div className="card-expandido__route-details">
                        <div><strong>Cidade/UF:</strong> {atm.origem?.municipio} - {atm.origem?.uf}</div>
                      </div>
                    </div>
                    {/* DESTINO */}
                    <div className="card-expandido__route-card">
                      <span className="card-expandido__route-tag">Destino (Entrega)</span>
                      <strong className="card-expandido__route-name">{atm.destino?.nome_local || 'Destinatário não especificado'}</strong>
                      <div className="card-expandido__route-details">
                        <div><strong>Cidade/UF:</strong> {atm.destino?.municipio} - {atm.destino?.uf}</div>
                      </div>
                    </div>
                  </div>

                  {/* 🌟 SEÇÃO 1: APENAS RASTREAMENTO */}
                  <div className="card-expandido__tracking-box" style={{ display: 'flex', gap: '12px', alignItems: 'stretch', marginTop: '1rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase' }}>
                        🔗 Link de Rastreio
                      </label>
                      <input 
                        type="url"
                        placeholder="Cole aqui a URL fornecida pela transportadora..."
                        className="card-expandido__tracking-input"
                        value={linkRastreio}
                        onChange={(e) => setLinkRastreio(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                      <button 
                        className="card-expandido__btn-save-link"
                        onClick={lidarComSalvarAcompanhamento}
                        disabled={salvandoLink || linkRastreio === (atm.link_rastreio || '')}
                        title="Salvar apenas o Link de Rastreio"
                        style={{ height: '44px' }}
                      >
                        {salvandoLink ? 'Salvando...' : <><Check size={16} /> Salvar Link</>}
                      </button>

                      {atm.link_rastreio && (
                        <a 
                          href={atm.link_rastreio} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="card-expandido__btn-link"
                          title="Abrir página de rastreio"
                          style={{ height: '44px' }}
                        >
                          <ExternalLink size={18} /> Acessar
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 🌟 SEÇÃO 2: APENAS MOTIVO / DIVERGÊNCIA */}
                  <div className="card-expandido__tracking-box" style={{ display: 'flex', gap: '12px', alignItems: 'stretch', marginTop: '1rem', backgroundColor: '#fff5f5', borderColor: '#fecaca' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#b91c1c', textTransform: 'uppercase' }}>
                        ⚠️ Registrar Divergência / Motivo
                      </label>
                      <Select
                        options={opcoesMotivos}
                        value={opcoesMotivos.find(opt => opt.value === motivoSelecionado) || (motivoSelecionado ? { value: motivoSelecionado, label: motivoSelecionado } : null)}
                        onChange={(selecionado) => setMotivoSelecionado(selecionado ? selecionado.value : '')}
                        placeholder={opcoesMotivos.length === 0 ? "Carregando motivos..." : "Selecione a divergência..."}
                        isClearable
                        styles={{
                          ...reactSelectStyles,
                          control: (base, state) => ({
                            ...reactSelectStyles.control(base, state),
                            borderColor: state.isFocused ? '#ef4444' : '#fca5a5',
                            boxShadow: state.isFocused ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
                            '&:hover': { borderColor: '#ef4444' }
                          })
                        }}
                        formatOptionLabel={formatarMotivoOption}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button 
                        className="card-expandido__btn-save-link"
                        onClick={lidarComSalvarAcompanhamento}
                        disabled={salvandoLink || motivoSelecionado === (atm.motivo || '')}
                        title="Salvar apenas o Motivo"
                        style={{ height: '44px', backgroundColor: '#ef4444' }}
                      >
                        {salvandoLink ? 'Salvando...' : <><Check size={16} /> Salvar Motivo</>}
                      </button>
                    </div>
                  </div>
                  
                  {/* BANNER DE MOTIVO JÁ EXISTENTE */}
                  {atm.motivo && (
                    <div style={{ 
                        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '1rem', 
                        borderRadius: '8px', border: `1px solid ${motivoCompleto?.cor || '#ef4444'}`, 
                        backgroundColor: `${motivoCompleto?.cor || '#ef4444'}10`, marginTop: '1rem'
                      }}>
                      <div style={{ marginTop: '2px' }}>
                        <AlertCircle color={motivoCompleto?.cor || '#ef4444'} size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', color: '#1e293b', fontSize: '1.05rem', marginBottom: '4px' }}>
                          Divergência Registrada: {atm.motivo}
                        </strong>
                        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.5 }}>
                          {motivoCompleto?.descricao || 'Nenhuma descrição detalhada fornecida.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. ÁREA DE ANEXOS (DROPZONE E ARQUIVOS DO BANCO) */}
                <div className="card-expandido__full-width">
                  <h4 className="card-expandido__section-title">Documentos Anexados (CT-e / Comprovante)</h4>

                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf, .doc, .docx, image/jpeg, image/png, image/jpg"
                    onChange={lidarComMudancaArquivo}
                  />

                  {/* DROPZONE DE UPLOAD */}
                  <div
                    onClick={!isUploading ? lidarComCliqueAnexar : undefined}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={!isUploading ? onDrop : undefined}
                    className={`card-expandido__dropzone ${isDragging ? 'card-expandido__dropzone--dragging' : ''}`}
                    style={{ opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'wait' : 'pointer' }}
                  >
                    <div className="card-expandido__dropzone-icon">
                      {isUploading ? <div style={{ fontSize: '2rem' }}>⏳</div> : <UploadCloud size={40} />}
                    </div>
                    <p className="card-expandido__dropzone-title">
                      {isUploading ? 'A enviar e processar arquivos. Aguarde...' : (isDragging ? 'Solte os ficheiros aqui!' : 'Clique ou arraste o comprovante de entrega para cá')}
                    </p>
                    <p className="card-expandido__dropzone-subtitle">
                      (Ao anexar, o status será mudado para Entregue e o link ficará salvo no banco)
                    </p>
                  </div>

                  {/* LISTAGEM DOS COMPROVANTES SALVOS NO BANCO DE DADOS */}
                  {comprovantesSalvos.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h5 style={{ color: '#475569', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Arquivos já armazenados no sistema:</h5>
                      <ul className="card-expandido__attachment-list">
                        {comprovantesSalvos.map((arquivo, index) => (
                          <li key={index} className="card-expandido__attachment-item" style={{ borderLeft: '4px solid #10b981' }}>
                            <div className="card-expandido__attachment-info">
                              <FileText size={16} color="#10b981" />
                              <span className="card-expandido__attachment-name" title={arquivo.nome}>{arquivo.nome}</span>
                              {arquivo.tamanho && (
                                <span className="card-expandido__attachment-size">({(arquivo.tamanho / 1024 / 1024).toFixed(2)} MB)</span>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <a 
                                href={arquivo.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#059669', textDecoration: 'none', backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                                title="Abrir e Baixar"
                              >
                                Visualizar
                              </a>
                              <button
                                onClick={() => removerAnexoSalvo(index)}
                                className="card-expandido__btn-remove"
                                title="Deletar este arquivo do banco de dados"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* RODAPÉ */}
            <div className="card-expandido__footer modal-footer">
              <BtnPdf atm={atm} />
              <div className="card-expandido__footer-actions">
                <button onClick={() => setModoEdicao(true)} className="card-expandido__btn-edit">
                  <EditIcon size={18} /> Editar Pedido Completo
                </button>
                <button className="btn-secondary" onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold' }}>
                  Fechar
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}