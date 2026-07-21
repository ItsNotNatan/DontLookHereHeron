// src/componentes/EditarLote/EditarLote.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import api from '../../services/api';
import './EditarLote.css';

// Ícones
const XCircle = ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const X = ({ size = 24 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const AlertTriangle = ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// 👇 Lista estática de Veículos
const LISTA_VEICULOS = [
  'FIORINO',
  'VAN',
  'CAMINHÃO VUC',
  'CAMINHÃO 3/4',
  'TRUCK',
  'CARRETA',
  'DOUBLE DECK',
  'CARRETA SIDER',
  'AÉREO'
];

// Estilo para o React Select corrigido (Alto Contraste)
const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: '#ffffff',
    borderRadius: '6px', 
    minHeight: '44px',
    borderColor: state.isFocused ? '#2563eb' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
    '&:hover': { borderColor: '#2563eb' }
  }),
  menu: (base) => ({ 
    ...base, 
    zIndex: 9999,
    backgroundColor: '#ffffff'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f8fafc' : '#ffffff',
    color: '#0f172a',
    cursor: 'pointer',
    padding: '10px 12px'
  }),
  singleValue: (base) => ({ 
    ...base, 
    color: '#0f172a',
    fontWeight: '500'
  }),
  input: (base) => ({
    ...base,
    color: '#0f172a'
  }),
  placeholder: (base) => ({ 
    ...base, 
    color: '#64748b',
    fontSize: '0.9rem' 
  })
};

export default function EditarLote({ aberto, onClose, idsSelecionados, onSalvar }) {
  const [projetosDisponiveis, setProjetosDisponiveis] = useState([]);
  const [motivosDisponiveis, setMotivosDisponiveis] = useState([]);
  const [transportadorasDisponiveis, setTransportadorasDisponiveis] = useState([]);
  const [dimensoes, setDimensoes] = useState({ comprimento: '', largura: '', altura: '' });

  // 🟢 Variável para travar datas logísticas para não permitir dias no passado
  const [dataMinima, setDataMinima] = useState('');

  // 🟢 Estados para as Máscaras de Dinheiro
  const [maskValorNf, setMaskValorNf] = useState('');
  const [maskValorPrevisto, setMaskValorPrevisto] = useState('');
  const [maskValorRealizado, setMaskValorRealizado] = useState('');

  // 🟢 ADICIONADO: elemento_pep_cc_wbs no estado inicial
  const estadoInicial = {
    solicitacao: '', data_solicitacao: '', pedido_compra: '', numero_reserva: '', wbs: '', nf: '',
    peso: '', volume: '', medidas: '', veiculo: '', tipo_frete: '', transportadora: '', cotacao_bid: '',
    status: '', tipo_operacao: '', motivo: '', link_rastreio: '', observacoes: '',
    origem: '', data_coleta: '', contato_coleta: '', telefone_coleta: '',
    destino: '', data_entrega: '', contato_entrega: '', telefone_entrega: '',
    tipo_documento: '', data_mapeamento: '', fatura_cte: '', data_emissao: '', vencimento: '', 
    elemento_pep_cc_wbs: '', validacao_pep: '', registrado_sap: ''
  };

  const [valores, setValores] = useState(estadoInicial);

  useEffect(() => {
    const fetchProjetos = async () => {
      try {
        const response = await api.get('/admin/projetos');
        setProjetosDisponiveis(response.data);
      } catch (e) {
        console.error("Erro ao buscar projetos", e);
      }
    };

    const fetchMotivos = async () => {
      try {
        
        const response = await api.get('/admin/motivos');
        setMotivosDisponiveis(response.data);
      } catch (e) {
        console.error("Erro ao buscar motivos", e);
      }
    };

    const fetchTransportadoras = async () => {
      try {
        const response = await api.get('/admin/transportadoras');
        setTransportadorasDisponiveis(response.data);
      } catch (e) {
        console.error("Erro ao buscar transportadoras", e);
      }
    };

    if (aberto) {
      // Calcula a data de hoje para bloquear dias antigos nos calendários
      const hoje = new Date();
      const timezoneOffset = hoje.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(hoje.getTime() - timezoneOffset)).toISOString().split('T')[0];
      setDataMinima(localISOTime);

      fetchProjetos();
      fetchMotivos();
      fetchTransportadoras();
    }
  }, [aberto]);

  if (!aberto) return null;

  // 🟢 FUNÇÃO DA MÁSCARA DE MOEDA
  const aplicarMascaraMoeda = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (v === '') return '';
    v = (parseInt(v, 10) / 100).toFixed(2) + '';
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return v;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && value !== '' && Number(value) < 0) {
      return; 
    }
    setValores(prev => ({ ...prev, [name]: value }));
  };

  const handleDimensoesChange = (e) => {
    const { name, value } = e.target;
    if (value !== '' && Number(value) < 0) {
      return;
    }
    setDimensoes(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, selecionado) => {
    setValores(prev => ({ ...prev, [name]: selecionado ? selecionado.value : '' }));
  };

  const handleLimpar = () => {
    setValores(estadoInicial);
    setDimensoes({ comprimento: '', largura: '', altura: '' }); 
    // 🟢 Limpa as máscaras de dinheiro também
    setMaskValorNf('');
    setMaskValorPrevisto('');
    setMaskValorRealizado('');
  };

  const handleSalvar = () => {
    const dadosParaAtualizar = Object.fromEntries(
      Object.entries(valores).filter(([_, v]) => v.trim() !== '')
    );
    
    // Constrói as dimensões
    if (dimensoes.comprimento || dimensoes.largura || dimensoes.altura) {
       const c = dimensoes.comprimento || '0';
       const l = dimensoes.largura || '0';
       const a = dimensoes.altura || '0';
       dadosParaAtualizar.medidas = `${c}x${l}x${a}`;
    }

    // 🟢 Traduz as máscaras financeiras de volta para números decimais (USANDO O NOME NOVO)
    if (maskValorNf) dadosParaAtualizar.valor_nf = maskValorNf.replace(/\./g, '').replace(',', '.');
    if (maskValorPrevisto) dadosParaAtualizar.valor_previsto = maskValorPrevisto.replace(/\./g, '').replace(',', '.');
    if (maskValorRealizado) dadosParaAtualizar.valor_realizado = maskValorRealizado.replace(/\./g, '').replace(',', '.');
    
    onSalvar(idsSelecionados, dadosParaAtualizar);
  };

  // Opções de Projetos
  const opcoesProjetos = projetosDisponiveis.map(p => ({
    value: p.wbs,
    label: p.wbs
  }));

  // Opções e formatação de Motivos
  const opcoesMotivos = motivosDisponiveis.map(m => ({ 
    value: m.nome, 
    label: m.nome, 
    color: m.cor, 
    description: m.descricao 
  }));

  // Opções para o Select de Transportadoras
  const opcoesTransportadoras = transportadorasDisponiveis.map(t => ({
    value: t.nome,
    label: t.nome
  }));

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

  return createPortal(
    <div className="batch-modal__overlay">
      <div className="batch-modal__content batch-modal__content--large fade-in">
        
        <div className="batch-modal__header">
          <div>
            <span className="batch-modal__subtitle">Alteração Múltipla</span>
            <h2 className="batch-modal__title">Editar {idsSelecionados?.length || 0} Itens em Lote</h2>
          </div>
          <button onClick={onClose} className="batch-modal__close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="batch-modal__body">
          <div className="batch-modal__alert">
            <AlertTriangle size={20} />
            <p><strong>Atenção:</strong> Apenas os campos que você preencher abaixo serão alterados. <strong>Os campos em branco manterão os valores originais</strong> de cada item.</p>
          </div>

          <div className="batch-modal__grid batch-modal__grid--cols-3">
            
            {/* --- STATUS E GERAL --- */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Status</label>
              <select name="status" value={valores.status} onChange={handleChange} className="batch-modal__input batch-modal__input--dropdown">
                <option value="">-- Deixar original --</option>
                <option value="Pendente">Pendente</option>
                <option value="Em Rota">Em Rota</option>
                <option value="Entregue">Entregue</option>
                <option value="Recusado">Recusado</option>
                <option value="Frete Morto">Frete Morto</option>
              </select>
            </div>
            
            <div className="batch-modal__field-card"><label className="batch-modal__label">Tipo de Operação</label>
              <select name="tipo_operacao" value={valores.tipo_operacao} onChange={handleChange} className="batch-modal__input batch-modal__input--dropdown">
                <option value="">-- Deixar original --</option>
                <option value="Nacional">NACIONAL</option>
                <option value="Importação">IMPORTAÇÃO</option>
              </select>
            </div>

            {/* CAIXA DE DIVERGÊNCIA */}
            <div className="batch-modal__field-card" style={{ backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderWidth: '1px', borderStyle: 'solid' }}>
              <label className="batch-modal__label" style={{ color: '#b91c1c', fontWeight: 'bold' }}>⚠️ Motivo/Divergência</label>
              <Select
                options={opcoesMotivos}
                value={opcoesMotivos.find(opt => opt.value === valores.motivo) || null}
                onChange={(selecionado) => handleSelectChange('motivo', selecionado)}
                placeholder="-- Deixar original --"
                isClearable
                isSearchable
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

            {/* --- IDENTIFICAÇÃO --- */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Solicitante</label>
              <input type="text" name="solicitacao" value={valores.solicitacao} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Data Solicitação</label>
              <input type="date" name="data_solicitacao" value={valores.data_solicitacao} onChange={handleChange} className="batch-modal__input" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Pedido de Compra</label>
              <input type="text" name="pedido_compra" value={valores.pedido_compra} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Nº Reserva</label>
              <input type="text" name="numero_reserva" value={valores.numero_reserva} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            
            <div className="batch-modal__field-card"><label className="batch-modal__label">Projeto / WBS</label>
              <Select
                options={opcoesProjetos}
                value={opcoesProjetos.find(opt => opt.value === valores.wbs) || null}
                onChange={(selecionado) => handleSelectChange('wbs', selecionado)}
                placeholder="-- Deixar original --"
                isClearable
                isSearchable
                styles={reactSelectStyles}
                noOptionsMessage={() => "Nenhum projeto encontrado"}
              />
            </div>

            <div className="batch-modal__field-card"><label className="batch-modal__label">Nota Fiscal</label>
              <input type="text" name="nf" value={valores.nf} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>

            {/* --- CARGA E TRANSPORTE --- */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Veículo</label>
              <select name="veiculo" value={valores.veiculo} onChange={handleChange} className="batch-modal__input batch-modal__input--dropdown">
                <option value="">-- Deixar original --</option>
                {LISTA_VEICULOS.map((veiculo, index) => (
                  <option key={index} value={veiculo}>
                    {veiculo}
                  </option>
                ))}
              </select>
            </div>

            <div className="batch-modal__field-card"><label className="batch-modal__label">Tipo Frete</label>
              <select name="tipo_frete" value={valores.tipo_frete} onChange={handleChange} className="batch-modal__input batch-modal__input--dropdown">
                <option value="">-- Deixar original --</option>
                <option value="Dedicado">DEDICADO</option>
                <option value="Fracionado">FRACIONADO</option>
                <option value="REDESPACHO/FRACIONADO">REDESPACHO/FRACIONADO</option>
                <option value="DIÁRIA/VIAGEM">DIÁRIA/VIAGEM</option>
                <option value="DEDICADO/FRACIONADO">DEDICADO/FRACIONADO</option>
              </select>
            </div>

            <div className="batch-modal__field-card"><label className="batch-modal__label">Transportadora</label>
              <Select
                options={opcoesTransportadoras}
                value={opcoesTransportadoras.find(opt => opt.value === valores.transportadora) || null}
                onChange={(selecionado) => handleSelectChange('transportadora', selecionado)}
                placeholder="-- Deixar original --"
                isClearable
                isSearchable
                styles={reactSelectStyles}
                noOptionsMessage={() => "Nenhuma transportadora encontrada"}
              />
            </div>
            
            <div className="batch-modal__field-card"><label className="batch-modal__label">Peso (kg)</label>
              <input type="number" name="peso" min="0" value={valores.peso} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Volume (m³)</label>
              <input type="number" name="volume" min="0" value={valores.volume} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            
            <div className="batch-modal__field-card"><label className="batch-modal__label">Medidas (C x L x A) em Metros</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="number" 
                  min="0"
                  name="comprimento" 
                  value={dimensoes.comprimento} 
                  onChange={handleDimensoesChange} 
                  className="batch-modal__input" 
                  placeholder="C" 
                  style={{ minWidth: '0' }}
                />
                <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>x</span>
                <input 
                  type="number" 
                  min="0"
                  name="largura" 
                  value={dimensoes.largura} 
                  onChange={handleDimensoesChange} 
                  className="batch-modal__input" 
                  placeholder="L" 
                  style={{ minWidth: '0' }}
                />
                <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>x</span>
                <input 
                  type="number" 
                  min="0"
                  name="altura" 
                  value={dimensoes.altura} 
                  onChange={handleDimensoesChange} 
                  className="batch-modal__input" 
                  placeholder="A" 
                  style={{ minWidth: '0' }}
                />
              </div>
            </div>

            {/* --- LOGÍSTICA --- */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Origem</label>
              <input type="text" name="origem" value={valores.origem} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            
            {/* 🟢 TRAVA DE DATA ADICIONADA: Coleta */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Data Coleta</label>
              <input type="date" min={dataMinima} name="data_coleta" value={valores.data_coleta} onChange={handleChange} className="batch-modal__input" />
            </div>
            
            <div className="batch-modal__field-card"><label className="batch-modal__label">Contato Coleta</label>
              <input type="text" name="contato_coleta" value={valores.contato_coleta} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            
            <div className="batch-modal__field-card"><label className="batch-modal__label">Destino</label>
              <input type="text" name="destino" value={valores.destino} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            
            {/* 🟢 TRAVA DE DATA ADICIONADA: Entrega */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Data Entrega</label>
              <input type="date" min={dataMinima} name="data_entrega" value={valores.data_entrega} onChange={handleChange} className="batch-modal__input" />
            </div>
            
            <div className="batch-modal__field-card"><label className="batch-modal__label">Contato Entrega</label>
              <input type="text" name="contato_entrega" value={valores.contato_entrega} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>

            <div className="batch-modal__field-card"><label className="batch-modal__label">Link de Rastreio</label>
              <input type="url" name="link_rastreio" value={valores.link_rastreio} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Observações</label>
              <input type="text" name="observacoes" value={valores.observacoes} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Cotação BID</label>
              <input type="text" name="cotacao_bid" value={valores.cotacao_bid} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>

            {/* --- FATURAMENTO E SAP --- */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Tipo Doc. Fatura</label>
              <input type="text" name="tipo_documento" value={valores.tipo_documento} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Fatura CTE</label>
              <input type="text" name="fatura_cte" value={valores.fatura_cte} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Data Mapeamento</label>
              <input type="date" name="data_mapeamento" value={valores.data_mapeamento} onChange={handleChange} className="batch-modal__input" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Data Emissão Fatura</label>
              <input type="date" name="data_emissao" value={valores.data_emissao} onChange={handleChange} className="batch-modal__input" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Vencimento Fatura</label>
              <input type="date" name="vencimento" value={valores.vencimento} onChange={handleChange} className="batch-modal__input" />
            </div>
            
            {/* 🟢 CAMPOS FINANCEIROS ATUALIZADOS COM MÁSCARA E NOMENCLATURA CORRETA */}
            <div className="batch-modal__field-card">
              <label className="batch-modal__label">Valor NF (R$)</label>
              <input 
                type="text" 
                value={maskValorNf} 
                onChange={(e) => setMaskValorNf(aplicarMascaraMoeda(e.target.value))} 
                className="batch-modal__input" 
                placeholder="Deixar original" 
              />
            </div>
            <div className="batch-modal__field-card">
              <label className="batch-modal__label">Valor Previsto (R$)</label>
              <input 
                type="text" 
                value={maskValorPrevisto} 
                onChange={(e) => setMaskValorPrevisto(aplicarMascaraMoeda(e.target.value))} 
                className="batch-modal__input" 
                placeholder="Deixar original" 
              />
            </div>
            <div className="batch-modal__field-card">
              <label className="batch-modal__label">Valor Realizado (R$)</label>
              <input 
                type="text" 
                value={maskValorRealizado} 
                onChange={(e) => setMaskValorRealizado(aplicarMascaraMoeda(e.target.value))} 
                className="batch-modal__input" 
                placeholder="Deixar original" 
              />
            </div>
            
            {/* 🟢 ADICIONADO: Campo Elemento PEP / CC */}
            <div className="batch-modal__field-card"><label className="batch-modal__label">Elemento PEP / CC</label>
              <input type="text" name="elemento_pep_cc_wbs" value={valores.elemento_pep_cc_wbs} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>

            <div className="batch-modal__field-card"><label className="batch-modal__label">Validação PEP</label>
              <input type="text" name="validacao_pep" value={valores.validacao_pep} onChange={handleChange} className="batch-modal__input" placeholder="Deixar original" />
            </div>
            <div className="batch-modal__field-card"><label className="batch-modal__label">Registrado SAP</label>
              <select name="registrado_sap" value={valores.registrado_sap} onChange={handleChange} className="batch-modal__input batch-modal__input--dropdown">
                <option value="">-- Deixar original --</option>
                <option value="SIM">SIM</option>
                <option value="NÃO">NÃO</option>
              </select>
            </div>

          </div>
        </div>

        <div className="batch-modal__footer">
          <button type="button" onClick={handleLimpar} className="batch-modal__btn batch-modal__btn--clear">
            <XCircle size={18} /> Limpar Edições
          </button>
          
          <button type="button" onClick={handleSalvar} className="batch-modal__btn batch-modal__btn--submit">
            Aplicar em {idsSelecionados?.length || 0} Itens
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
