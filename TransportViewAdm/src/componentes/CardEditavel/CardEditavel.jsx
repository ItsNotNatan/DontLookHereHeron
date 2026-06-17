// src/componentes/CardEditavel/CardEditavel.jsx
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import api from '../../services/api';
import './CardEditavel.css';

const SaveIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

// 🟢 FUNÇÃO PARA FORMATAR O VALOR DE DINHEIRO
const formatarValorInicial = (valorBanco) => {
  if (!valorBanco) return '';
  let num = Number(valorBanco).toFixed(2); 
  let str = num.replace('.', ','); 
  return str.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); 
};

// 🟢 FUNÇÃO PARA EXTRAIR O NÚMERO LIMPO E ENVIAR AO BANCO
const extrairNumeroMoeda = (str) => {
  if (!str) return null;
  const valorLimpo = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(valorLimpo);
};

// Traduz a data do Banco para o "Calendáriozinho" entender e mostrar DD/MM/AAAA
const formatarParaInputDate = (dataStr) => {
  if (!dataStr) return '';
  if (dataStr.includes('/')) {
    const partes = dataStr.split(' ')[0].split('/'); 
    if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }
  if (dataStr.includes('-')) {
    return dataStr.split('T')[0];
  }
  return '';
};

export default function CardEditavel({ atm, onCancelar, onSalvar }) {
  const [salvando, setSalvando] = useState(false);
  
  // 🟢 ESTADO PARA CONTROLAR AS ABAS
  const [abaAtiva, setAbaAtiva] = useState('operacao');

  const [dataMinima, setDataMinima] = useState('');

  const [opcoesTransportadoras, setOpcoesTransportadoras] = useState([]);
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState(atm.transportadora?.nome || '');

  const [opcoesWbs, setOpcoesWbs] = useState([]);
  const [wbsSelecionada, setWbsSelecionada] = useState(atm.wbs || '');

  const [opcoesMotivos, setOpcoesMotivos] = useState([]);
  const [motivoSelecionado, setMotivoSelecionado] = useState(atm.motivo || '');

  const [enderecosFixos, setEnderecosFixos] = useState([]);
  const [enderecoColetaSelecionado, setEnderecoColetaSelecionado] = useState(null);
  const [enderecoEntregaSelecionado, setEnderecoEntregaSelecionado] = useState(null);

  // ESTADOS PARA AS MÁSCARAS FINANCEIRAS DE DINHEIRO
  const [maskValorNf, setMaskValorNf] = useState(formatarValorInicial(atm.valor_nf));
  const [maskValorPrevisto, setMaskValorPrevisto] = useState(formatarValorInicial(atm.faturamento?.valor_previsto || atm.valor_previsto));
  const [maskValorRealizado, setMaskValorRealizado] = useState(formatarValorInicial(atm.valor_realizado));

  const [coleta, setColeta] = useState({
    logradouro: atm.origem?.logradouro || '',
    numero: atm.origem?.numero || '',
    municipio: atm.origem?.municipio || '',
    uf: atm.origem?.uf || ''
  });

  const [entrega, setEntrega] = useState({
    logradouro: atm.destino?.logradouro || '',
    numero: atm.destino?.numero || '',
    municipio: atm.destino?.municipio || '',
    uf: atm.destino?.uf || ''
  });

  const [cargas, setCargas] = useState(() => {
    if (!atm.lista_cargas) return [];
    try {
      return typeof atm.lista_cargas === 'string' ? JSON.parse(atm.lista_cargas) : atm.lista_cargas;
    } catch (e) {
      console.error("Erro ao ler lista de cargas", e);
      return [];
    }
  });

  const [novaCarga, setNovaCarga] = useState({
    nome: '', quantidade: 1, peso: '', comprimento: '', largura: '', altura: '', cor: '#3b82f6'
  });

  const dataEntregaFormatada = formatarParaInputDate(atm.data_entrega);
  const dataColetaFormatada = formatarParaInputDate(atm.data_coleta);
  const dataSolFormatada = formatarParaInputDate(atm.data_solicitacao || atm.created_at);

  const medidasAtuais = atm.medidas ? atm.medidas.replace(/m/gi, '').split('x') : ['', '', ''];
  const compAtual = medidasAtuais[0]?.trim() || '';
  const largAtual = medidasAtuais[1]?.trim() || '';
  const altAtual = medidasAtuais[2]?.trim() || '';

  // Datas Extras de Faturamento
  const dataMapFormatada = formatarParaInputDate(atm.faturamento?.data_mapeamento || atm.data_mapeamento);
  const dataEmiFormatada = formatarParaInputDate(atm.faturamento?.data_emissao || atm.data_emissao);
  const dataVencFormatada = formatarParaInputDate(atm.faturamento?.vencimento || atm.vencimento);

  useEffect(() => {
    const hoje = new Date();
    const timezoneOffset = hoje.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(hoje.getTime() - timezoneOffset)).toISOString().split('T')[0];
    setDataMinima(localISOTime);

    const carregarDadosApoio = async () => {
      try {
        const [resTransp, resProj, resLocais, resMotivos] = await Promise.all([
          api.get('/admin/transportadoras'),
          api.get('/admin/projetos'),
          api.get('/admin/locais'),
          api.get('/admin/motivos')
        ]);
        
        setOpcoesTransportadoras(resTransp.data.map(t => ({ value: t.nome, label: t.nome })));
        
        setOpcoesWbs(resProj.data.map(p => ({ 
          value: p.wbs, 
          label: p.descricao ? `${p.wbs} - ${p.descricao}` : p.wbs 
        })));

        setOpcoesMotivos(resMotivos.data.map(m => ({ 
          value: m.nome, 
          label: m.nome,
          color: m.cor,
          description: m.descricao
        })));

        const locaisMapeados = resLocais.data.map(l => ({
          value: l.id,
          label: `${l.nome_local} - ${l.municipio}/${l.uf}`,
          dadosCompletos: l
        }));
        setEnderecosFixos([...locaisMapeados, { value: 'outro', label: 'Outro / Limpar Campos...' }]);

      } catch (erro) {
        console.error("Erro ao carregar dados de apoio:", erro);
      }
    };
    carregarDadosApoio();
  }, []);

  const aplicarMascaraMoeda = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (v === '') return '';
    v = (parseInt(v, 10) / 100).toFixed(2) + '';
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return v;
  };

  const handleSelectColeta = (opcao) => {
    setEnderecoColetaSelecionado(opcao);
    if (opcao && opcao.value !== 'outro') {
      const local = opcao.dadosCompletos;
      setColeta(prev => ({
        ...prev, logradouro: local.logradouro || '', numero: local.numero || '', municipio: local.municipio || '', uf: local.uf || ''
      }));
    } else {
      setColeta(prev => ({ ...prev, logradouro: '', numero: '', municipio: '', uf: '' }));
    }
  };

  const handleSelectEntrega = (opcao) => {
    setEnderecoEntregaSelecionado(opcao);
    if (opcao && opcao.value !== 'outro') {
      const local = opcao.dadosCompletos;
      setEntrega(prev => ({
        ...prev, logradouro: local.logradouro || '', numero: local.numero || '', municipio: local.municipio || '', uf: local.uf || ''
      }));
    } else {
      setEntrega(prev => ({ ...prev, logradouro: '', numero: '', municipio: '', uf: '' }));
    }
  };

  const handleAddCarga = () => {
    if (!novaCarga.nome || !novaCarga.peso) {
      alert("Preencha pelo menos o Nome e o Peso Unitário do item.");
      return;
    }
    setCargas([...cargas, { ...novaCarga, id: Date.now() }]);
    setNovaCarga({ nome: '', quantidade: 1, peso: '', comprimento: '', largura: '', altura: '', cor: '#3b82f6' });
  };

  const handleRemoveCarga = (id) => {
    setCargas(cargas.filter(carga => carga.id !== id));
  };

  const handleEditCarga = (id, campo, valor) => {
    setCargas(cargas.map(carga => carga.id === id ? { ...carga, [campo]: valor } : carga));
  };

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
        {description && (
          <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '20px', lineHeight: 1.3 }}>{description}</span>
        )}
      </div>
    );
  };

  const reactSelectStyles = {
    control: (base, state) => ({
      ...base, borderRadius: '6px', minHeight: '40px',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
      '&:hover': { borderColor: '#3b82f6' }, fontSize: '0.9rem'
    }),
    option: (base, state) => ({
      ...base, backgroundColor: state.isFocused ? '#f1f5f9' : 'white', cursor: 'pointer', padding: '8px 12px'
    }),
    menu: (base) => ({ ...base, zIndex: 9999 })
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    
    const formData = new FormData(e.target);
    const d = Object.fromEntries(formData.entries());

    if (d.data_coleta && d.data_coleta < dataMinima) {
      alert("A Data de Coleta não pode ser no passado.");
      setSalvando(false); return;
    }
    if (d.data_entrega && d.data_entrega < dataMinima) {
      alert("A Data de Entrega não pode ser no passado.");
      setSalvando(false); return;
    }

    const medidasCombinadas = (d.medida_c || d.medida_l || d.medida_a) 
      ? `${d.medida_c || 0}x${d.medida_l || 0}x${d.medida_a || 0}m` 
      : '';

    const dadosParaEnviar = {
      // DADOS DA OPERAÇÃO ESPELHADOS DA TABELA
      status: d.status,
      tipo_operacao: d.tipo_operacao,
      wbs: d.wbs,
      solicitacao: d.solicitacao,
      pedido_compra: d.pedido_compra,
      nf: d.nf,
      nome_transportadora: d.transportadora,
      valor_previsto: extrairNumeroMoeda(maskValorPrevisto),
      valor_nf: extrairNumeroMoeda(maskValorNf),
      tipo_frete: d.tipo_frete,
      veiculo: d.veiculo,
      
      // RESTANTE DA OPERAÇÃO
      data_solicitacao: d.data_solicitacao,
      peso: d.peso,
      volume: d.volume,
      medidas: medidasCombinadas,
      lista_cargas: JSON.stringify(cargas),
      link_rastreio: d.link_rastreio,
      motivo: d.motivo, 
      observacoes: d.observacoes,
      data_coleta: d.data_coleta,
      contato_coleta: d.contato_coleta,
      telefone_coleta: d.telefone_coleta,
      origem: {
        logradouro: d.origem_rua, numero: d.origem_num, municipio: d.origem_cidade, uf: d.origem_uf
      },
      data_entrega: d.data_entrega,
      contato_entrega: d.contato_entrega,
      telefone_entrega: d.telefone_entrega,
      destino: {
        logradouro: d.destino_rua, numero: d.destino_num, municipio: d.destino_cidade, uf: d.destino_uf
      },

      // DADOS DE FATURAMENTO / SAP
      tipo_documento: d.tipo_documento,
      data_mapeamento: d.data_mapeamento,
      fatura_cte: d.fatura_cte,
      valor_realizado: extrairNumeroMoeda(maskValorRealizado),
      data_emissao: d.data_emissao,
      vencimento: d.vencimento,
      elemento_pep_cc_wbs: d.elemento_pep_cc_wbs,
      validacao_pep: d.validacao_pep,
      registrado_sap: d.registrado_sap,
      numero_reserva: d.numero_reserva,
      cotacao_bid: d.cotacao_bid
    };

    try {
      await api.put(`/admin/transportes/${atm.id}`, dadosParaEnviar);
      alert('✅ Alterações salvas com sucesso!');
      onSalvar(); 
    } catch (erro) {
      console.error(erro);
      alert('❌ Erro ao salvar: ' + (erro.response?.data?.erro || 'Falha na conexão'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form className="card-editavel" onSubmit={handleSubmit}>
      <div className="card-editavel__content">
        
        {/* 🟢 ABAS DE NAVEGAÇÃO */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
          <button 
            type="button" 
            onClick={() => setAbaAtiva('operacao')}
            style={{ 
              background: 'none', border: 'none', padding: '10px 15px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              color: abaAtiva === 'operacao' ? '#2563eb' : '#64748b',
              borderBottom: abaAtiva === 'operacao' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: '-2px'
            }}
          >
            📦 Dados da Operação
          </button>
          <button 
            type="button" 
            onClick={() => setAbaAtiva('faturamento')}
            style={{ 
              background: 'none', border: 'none', padding: '10px 15px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              color: abaAtiva === 'faturamento' ? '#059669' : '#64748b',
              borderBottom: abaAtiva === 'faturamento' ? '3px solid #059669' : '3px solid transparent',
              marginBottom: '-2px'
            }}
          >
            💰 Faturamento / SAP
          </button>
        </div>

        {/* ==================================================== */}
        {/* ABA: DADOS DE OPERAÇÃO */}
        {/* ==================================================== */}
        <div style={{ display: abaAtiva === 'operacao' ? 'block' : 'none' }}>
          
          <h4 className="card-editavel__section-title" style={{ marginTop: 0 }}>Espelho da Tabela</h4>
          <div className="card-editavel__grid card-editavel__grid--cols-4">
            
            {/* LINHA 1 DA TABELA */}
            <div>
              <label className="card-editavel__label">Tipo Operação</label>
              <select name="tipo_operacao" defaultValue={atm.tipo_operacao} className="card-editavel__select">
                <option value="Nacional">NACIONALIZADO</option>
                <option value="Importação">IMPORTAÇÃO</option>
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              <label className="card-editavel__label">Projeto / WBS</label>
              <input type="hidden" name="wbs" value={wbsSelecionada} />
              <Select
                options={opcoesWbs} value={opcoesWbs.find(opt => opt.value === wbsSelecionada) || (wbsSelecionada ? { value: wbsSelecionada, label: wbsSelecionada } : null)}
                onChange={(selecionado) => setWbsSelecionada(selecionado ? selecionado.value : '')}
                placeholder="Buscar WBS..." isSearchable isClearable styles={reactSelectStyles}
              />
            </div>
            <div>
              <label className="card-editavel__label">Solicitante</label>
              <input type="text" name="solicitacao" defaultValue={atm.solicitacao} className="card-editavel__input" />
            </div>
            <div>
              <label className="card-editavel__label">Status Atual</label>
              <select name="status" defaultValue={atm.status} className="card-editavel__select card-editavel__select--highlight">
                <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                <option value="Em Trânsito">Em Trânsito</option>
                <option value="Entregue">Entregue</option>
                <option value="Frete morto">Frete morto</option>
                <option value="Recusado">Recusado</option>
              </select>
            </div>

            {/* LINHA 2 DA TABELA */}
            <div>
              <label className="card-editavel__label">Pedido Compra</label>
              <input type="text" name="pedido_compra" defaultValue={atm.pedido_compra} className="card-editavel__input" />
            </div>
            <div>
              <label className="card-editavel__label">Nota Fiscal (NF)</label>
              <input type="text" name="nf" defaultValue={atm.nf} className="card-editavel__input" />
            </div>
            <div style={{ position: 'relative' }}>
              <label className="card-editavel__label">Transportadora</label>
              <input type="hidden" name="transportadora" value={transportadoraSelecionada} />
              <Select
                options={opcoesTransportadoras} value={opcoesTransportadoras.find(opt => opt.value === transportadoraSelecionada) || (transportadoraSelecionada ? { value: transportadoraSelecionada, label: transportadoraSelecionada } : null)}
                onChange={(selecionado) => setTransportadoraSelecionada(selecionado ? selecionado.value : '')}
                placeholder="Buscar transportadora..." isSearchable isClearable styles={reactSelectStyles}
              />
            </div>
            <div>
              <label className="card-editavel__label">Tipo de Frete</label>
              <select name="tipo_frete" defaultValue={atm.tipo_frete} className="card-editavel__select">
                <option value="">Selecione...</option>
                <option value="DEDICADO">DEDICADO</option>
                <option value="FRACIONADO">FRACIONADO</option>
                <option value="REDESPACHO/FRACIONADO">REDESPACHO/FRACIONADO</option>
                <option value="DIÁRIA/VIAGEM">DIÁRIA/VIAGEM</option>
                <option value="DEDICADO/FRACIONADO">DEDICADO/FRACIONADO</option>
              </select>
            </div>

            {/* LINHA 3 DA TABELA */}
            <div>
              <label className="card-editavel__label">Valor Previsto (R$)</label>
              <input type="text" name="valor_previsto_mask" className="card-editavel__input" placeholder="0,00" value={maskValorPrevisto} onChange={(e) => setMaskValorPrevisto(aplicarMascaraMoeda(e.target.value))} />
            </div>
            <div>
              <label className="card-editavel__label">Valor NF (R$)</label>
              <input type="text" name="valor_nf_mask" className="card-editavel__input" placeholder="0,00" value={maskValorNf} onChange={(e) => setMaskValorNf(aplicarMascaraMoeda(e.target.value))} />
            </div>
            <div>
              <label className="card-editavel__label">Veículo Sugerido</label>
              <select name="veiculo" defaultValue={atm.veiculo?.toUpperCase() || ''} className="card-editavel__select">
                <option value="">Selecione...</option>
                <option value="FIORINO">FIORINO</option>
                <option value="VAN">VAN</option>
                <option value="CAMINHÃO VUC">CAMINHÃO VUC</option>
                <option value="CAMINHÃO 3/4">CAMINHÃO 3/4</option>
                <option value="TRUCK">TRUCK</option>
                <option value="CARRETA">CARRETA</option>
                <option value="DOUBLE DECK">DOUBLE DECK</option>
                <option value="CARRETA SIDER">CARRETA SIDER</option>
                <option value="AÉREO">AÉREO</option>
              </select>
            </div>
            <div>
              <label className="card-editavel__label">Data Solicitação</label>
              <input type="date" name="data_solicitacao" defaultValue={dataSolFormatada} className="card-editavel__input" />
            </div>
          </div>

          <h4 className="card-editavel__section-title">Rota (Origem e Destino)</h4>
          <div className="card-editavel__grid card-editavel__grid--cols-2">
            {/* Origem */}
            <div className="card-editavel__address-box">
              <div className="card-editavel__address-header">
                <span className="card-editavel__address-title">COLETA (Origem)</span>
                <input type="date" min={dataMinima} name="data_coleta" defaultValue={dataColetaFormatada} className="card-editavel__input card-editavel__input--date-small" title="Data de Coleta" />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Select
                  options={enderecosFixos} value={enderecoColetaSelecionado} onChange={handleSelectColeta}
                  placeholder="Selecione um local cadastrado..." isSearchable isClearable styles={reactSelectStyles}
                />
              </div>

              <div className="card-editavel__address-row" style={{ marginBottom: '10px' }}>
                <input type="text" name="contato_coleta" defaultValue={atm.contato_coleta} placeholder="Nome do Contato" className="card-editavel__input" />
                <input type="text" name="telefone_coleta" defaultValue={atm.telefone_coleta} placeholder="Telefone" className="card-editavel__input" />
              </div>
              <input type="text" name="origem_rua" value={coleta.logradouro} onChange={(e) => setColeta({...coleta, logradouro: e.target.value})} placeholder="Rua / Logradouro" className="card-editavel__input" />
              <div className="card-editavel__address-row">
                <input type="text" name="origem_num" value={coleta.numero} onChange={(e) => setColeta({...coleta, numero: e.target.value})} placeholder="Nº" className="card-editavel__input card-editavel__input--small" />
                <input type="text" name="origem_cidade" value={coleta.municipio} onChange={(e) => setColeta({...coleta, municipio: e.target.value})} placeholder="Cidade" className="card-editavel__input" />
                <input type="text" name="origem_uf" value={coleta.uf} onChange={(e) => setColeta({...coleta, uf: e.target.value})} placeholder="UF" maxLength="2" className="card-editavel__input card-editavel__input--xsmall" style={{ textTransform: 'uppercase' }} />
              </div>
            </div>
            
            {/* Destino */}
            <div className="card-editavel__address-box">
              <div className="card-editavel__address-header">
                <span className="card-editavel__address-title" style={{ color: '#059669' }}>ENTREGA (Destino)</span>
                <input type="date" min={dataMinima} name="data_entrega" defaultValue={dataEntregaFormatada} className="card-editavel__input card-editavel__input--date-small" title="Data de Entrega" />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Select
                  options={enderecosFixos} value={enderecoEntregaSelecionado} onChange={handleSelectEntrega}
                  placeholder="Selecione um local cadastrado..." isSearchable isClearable styles={reactSelectStyles}
                />
              </div>

              <div className="card-editavel__address-row" style={{ marginBottom: '10px' }}>
                <input type="text" name="contato_entrega" defaultValue={atm.contato_entrega} placeholder="Nome do Contato" className="card-editavel__input" />
                <input type="text" name="telefone_entrega" defaultValue={atm.telefone_entrega} placeholder="Telefone" className="card-editavel__input" />
              </div>
              <input type="text" name="destino_rua" value={entrega.logradouro} onChange={(e) => setEntrega({...entrega, logradouro: e.target.value})} placeholder="Rua / Logradouro" className="card-editavel__input" />
              <div className="card-editavel__address-row">
                <input type="text" name="destino_num" value={entrega.numero} onChange={(e) => setEntrega({...entrega, numero: e.target.value})} placeholder="Nº" className="card-editavel__input card-editavel__input--small" />
                <input type="text" name="destino_cidade" value={entrega.municipio} onChange={(e) => setEntrega({...entrega, municipio: e.target.value})} placeholder="Cidade" className="card-editavel__input" />
                <input type="text" name="destino_uf" value={entrega.uf} onChange={(e) => setEntrega({...entrega, uf: e.target.value})} placeholder="UF" maxLength="2" className="card-editavel__input card-editavel__input--xsmall" style={{ textTransform: 'uppercase' }} />
              </div>
            </div>
          </div>

          <h4 className="card-editavel__section-title">Itens da Carga e Totais</h4>
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div className="card-editavel__grid card-editavel__grid--cols-4">
              <div className="card-editavel__grid-item--span-2">
                <label className="card-editavel__label">Nome / Descrição (NOVO)</label>
                <input type="text" value={novaCarga.nome} onChange={e => setNovaCarga({ ...novaCarga, nome: e.target.value })} className="card-editavel__input" placeholder="Ex: Pallet de eletrônicos" />
              </div>
              <div>
                <label className="card-editavel__label">Quantidade</label>
                <input type="number" min="1" value={novaCarga.quantidade} onChange={e => setNovaCarga({ ...novaCarga, quantidade: e.target.value })} className="card-editavel__input" />
              </div>
              <div>
                <label className="card-editavel__label">Cor (Visual)</label>
                <input type="color" value={novaCarga.cor} onChange={e => setNovaCarga({ ...novaCarga, cor: e.target.value })} className="card-editavel__input" style={{ height: '38px', padding: '2px', cursor: 'pointer' }} />
              </div>
            </div>

            <div className="card-editavel__grid card-editavel__grid--cols-4" style={{ marginTop: '10px' }}>
              <div>
                <label className="card-editavel__label">Peso Unit. (kg)</label>
                <input type="number" step="0.01" min="0" value={novaCarga.peso} onChange={e => setNovaCarga({ ...novaCarga, peso: e.target.value })} className="card-editavel__input" placeholder="0.00" />
              </div>
              <div>
                <label className="card-editavel__label">Comp. (m)</label>
                <input type="number" step="0.01" min="0" value={novaCarga.comprimento} onChange={e => setNovaCarga({ ...novaCarga, comprimento: e.target.value })} className="card-editavel__input" placeholder="0.00" />
              </div>
              <div>
                <label className="card-editavel__label">Larg. (m)</label>
                <input type="number" step="0.01" min="0" value={novaCarga.largura} onChange={e => setNovaCarga({ ...novaCarga, largura: e.target.value })} className="card-editavel__input" placeholder="0.00" />
              </div>
              <div>
                <label className="card-editavel__label">Alt. (m)</label>
                <input type="number" step="0.01" min="0" value={novaCarga.altura} onChange={e => setNovaCarga({ ...novaCarga, altura: e.target.value })} className="card-editavel__input" placeholder="0.00" />
              </div>
            </div>

            <button type="button" onClick={handleAddCarga} className="card-editavel__btn card-editavel__btn--save" style={{ marginTop: '15px', padding: '6px 12px', fontSize: '0.85rem' }}>
              + Adicionar Item
            </button>

            {cargas.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', marginBottom: '10px' }} />
                <label className="card-editavel__label">Itens Adicionados</label>
                {cargas.map(carga => (
                  <div key={carga.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderLeft: `6px solid ${carga.cor || '#ccc'}`, padding: '12px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ flex: 1, paddingRight: '15px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 2 }}>
                          <label className="card-editavel__label" style={{ fontSize: '0.65rem', marginBottom: '2px', color: '#64748b' }}>Nome do Item</label>
                          <input type="text" value={carga.nome} onChange={e => handleEditCarga(carga.id, 'nome', e.target.value)} className="card-editavel__input" style={{ padding: '4px 8px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="card-editavel__label" style={{ fontSize: '0.65rem', marginBottom: '2px', color: '#64748b' }}>Qtd</label>
                          <input type="number" min="1" value={carga.quantidade} onChange={e => handleEditCarga(carga.id, 'quantidade', e.target.value)} className="card-editavel__input" style={{ padding: '4px 8px' }} />
                        </div>
                        <div>
                          <label className="card-editavel__label" style={{ fontSize: '0.65rem', marginBottom: '2px', color: '#64748b' }}>Cor</label>
                          <input type="color" value={carga.cor || '#ccc'} onChange={e => handleEditCarga(carga.id, 'cor', e.target.value)} className="card-editavel__input" style={{ width: '45px', height: '30px', padding: '1px', cursor: 'pointer' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="card-editavel__label" style={{ fontSize: '0.65rem', marginBottom: '2px', color: '#64748b' }}>Peso (kg)</label>
                          <input type="number" step="0.01" min="0" value={carga.peso} onChange={e => handleEditCarga(carga.id, 'peso', e.target.value)} className="card-editavel__input" style={{ padding: '4px 8px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="card-editavel__label" style={{ fontSize: '0.65rem', marginBottom: '2px', color: '#64748b' }}>Comp. (m)</label>
                          <input type="number" step="0.01" min="0" value={carga.comprimento} onChange={e => handleEditCarga(carga.id, 'comprimento', e.target.value)} className="card-editavel__input" style={{ padding: '4px 8px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="card-editavel__label" style={{ fontSize: '0.65rem', marginBottom: '2px', color: '#64748b' }}>Larg. (m)</label>
                          <input type="number" step="0.01" min="0" value={carga.largura} onChange={e => handleEditCarga(carga.id, 'largura', e.target.value)} className="card-editavel__input" style={{ padding: '4px 8px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="card-editavel__label" style={{ fontSize: '0.65rem', marginBottom: '2px', color: '#64748b' }}>Alt. (m)</label>
                          <input type="number" step="0.01" min="0" value={carga.altura} onChange={e => handleEditCarga(carga.id, 'altura', e.target.value)} className="card-editavel__input" style={{ padding: '4px 8px' }} />
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleRemoveCarga(carga.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.4rem', padding: '8px' }} title="Excluir item">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="card-editavel__grid card-editavel__grid--cols-4" style={{ marginTop: '20px' }}>
              <div>
                <label className="card-editavel__label">Peso Total (kg)</label>
                <input type="number" step="0.01" name="peso" defaultValue={atm.peso} className="card-editavel__input" placeholder="0.00" />
              </div>
              <div>
                <label className="card-editavel__label">Volume Total (m³)</label>
                <input type="number" step="0.01" name="volume" defaultValue={atm.volume} className="card-editavel__input" placeholder="0.00" />
              </div>
              <div className="card-editavel__grid-item--span-2">
                <label className="card-editavel__label" style={{ marginBottom: '4px' }}>Medidas Totais (C x L x A) m</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" step="0.01" min="0" name="medida_c" defaultValue={compAtual} className="card-editavel__input" placeholder="C" style={{ textAlign: 'center' }} />
                  <input type="number" step="0.01" min="0" name="medida_l" defaultValue={largAtual} className="card-editavel__input" placeholder="L" style={{ textAlign: 'center' }} />
                  <input type="number" step="0.01" min="0" name="medida_a" defaultValue={altAtual} className="card-editavel__input" placeholder="A" style={{ textAlign: 'center' }} />
                </div>
              </div>
            </div>
          </div>

          <h4 className="card-editavel__section-title">Acompanhamento</h4>
          <div className="card-editavel__grid card-editavel__grid--cols-2">
            <div>
              <label className="card-editavel__label">Link de Rastreio</label>
              <input type="url" name="link_rastreio" defaultValue={atm.link_rastreio} className="card-editavel__input" placeholder="https://" />
            </div>
            
            <div style={{ position: 'relative' }}>
              <label className="card-editavel__label">Motivo (Divergência/Atraso)</label>
              <input type="hidden" name="motivo" value={motivoSelecionado} />
              <Select
                options={opcoesMotivos} value={opcoesMotivos.find(opt => opt.value === motivoSelecionado) || (motivoSelecionado ? { value: motivoSelecionado, label: motivoSelecionado } : null)}
                onChange={(selecionado) => setMotivoSelecionado(selecionado ? selecionado.value : '')}
                placeholder="Selecione a divergência..." isClearable styles={reactSelectStyles} formatOptionLabel={formatarMotivoOption}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', marginTop: '10px' }}>
            <label className="card-editavel__label">Observações Internas</label>
            <textarea name="observacoes" defaultValue={atm.observacoes} className="card-editavel__input" rows="3" placeholder="Anotações sobre a carga, alertas, etc..." style={{ resize: 'vertical' }}></textarea>
          </div>
        </div>

        {/* ==================================================== */}
        {/* ABA: FATURAMENTO E SAP */}
        {/* ==================================================== */}
        <div style={{ display: abaAtiva === 'faturamento' ? 'block' : 'none' }}>
          
          <h4 className="card-editavel__section-title" style={{ marginTop: 0, color: '#059669', borderColor: '#d1fae5' }}>Integração Fiscal e SAP</h4>
          
          <div className="card-editavel__grid card-editavel__grid--cols-4">
            
            {/* LINHA 1 FATURAMENTO */}
            <div>
              <label className="card-editavel__label">Tipo Documento</label>
              <input type="text" name="tipo_documento" defaultValue={atm.faturamento?.tipo_documento || atm.tipo_documento} className="card-editavel__input" placeholder="Ex: NFSe" />
            </div>
            <div>
              <label className="card-editavel__label">Data Mapeamento</label>
              <input type="date" name="data_mapeamento" defaultValue={dataMapFormatada} className="card-editavel__input" />
            </div>
            <div>
              <label className="card-editavel__label">Fatura (CT-e)</label>
              <input type="text" name="fatura_cte" defaultValue={atm.faturamento?.fatura_cte || atm.fatura_cte} className="card-editavel__input" />
            </div>
            <div>
              <label className="card-editavel__label">Valor Realizado (R$)</label>
              <input type="text" name="valor_realizado_mask" className="card-editavel__input" placeholder="0,00" value={maskValorRealizado} onChange={(e) => setMaskValorRealizado(aplicarMascaraMoeda(e.target.value))} />
            </div>

            {/* LINHA 2 FATURAMENTO */}
            <div>
              <label className="card-editavel__label">Data Emissão Fatura</label>
              <input type="date" name="data_emissao" defaultValue={dataEmiFormatada} className="card-editavel__input" />
            </div>
            <div>
              <label className="card-editavel__label">Vencimento Fatura</label>
              <input type="date" name="vencimento" defaultValue={dataVencFormatada} className="card-editavel__input" />
            </div>
            <div>
              <label className="card-editavel__label">Elemento PEP / CC</label>
              <input type="text" name="elemento_pep_cc_wbs" defaultValue={atm.faturamento?.elemento_pep_cc_wbs || atm.elemento_pep_cc_wbs || ''} className="card-editavel__input" placeholder="Ex: P-123456" />
            </div>
            <div>
              <label className="card-editavel__label">Validação PEP</label>
              <input type="text" name="validacao_pep" defaultValue={atm.faturamento?.validacao_pep || atm.validacao_pep} className="card-editavel__input" placeholder="OK/Erro..." />
            </div>

            {/* LINHA 3 FATURAMENTO */}
            <div>
              <label className="card-editavel__label">Registrado SAP?</label>
              <select name="registrado_sap" defaultValue={atm.faturamento?.registrado_sap || atm.registrado_sap || ''} className="card-editavel__select">
                <option value="">Não Especificado</option>
                <option value="SIM">SIM (Concluído)</option>
                <option value="NÃO">NÃO (Pendente)</option>
              </select>
            </div>
            <div>
              <label className="card-editavel__label">Nº Reserva</label>
              <input type="text" name="numero_reserva" defaultValue={atm.numero_reserva} className="card-editavel__input" />
            </div>
            <div className="card-editavel__grid-item--span-2">
              <label className="card-editavel__label">Cotação / BID</label>
              <input type="text" name="cotacao_bid" defaultValue={atm.cotacao_bid} className="card-editavel__input" />
            </div>

          </div>
        </div>
        {/* FIM DA ABA FATURAMENTO */}
        
      </div>

      <div className="card-editavel__footer">
        <button type="button" onClick={onCancelar} className="card-editavel__btn card-editavel__btn--cancel">
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className="card-editavel__btn card-editavel__btn--save">
          {salvando ? 'Salvando...' : <><SaveIcon /> Salvar Alterações</>}
        </button>
      </div>

    </form>
  );
}
