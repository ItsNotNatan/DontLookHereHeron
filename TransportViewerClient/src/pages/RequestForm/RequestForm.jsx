// src/pages/RequestForm/RequestForm.jsx
import React, { useState, useEffect } from 'react';
import AbaSimulacao from '../../components/AbaSimulacao/AbaSimulacao.jsx';
import Select from 'react-select'; 
import './RequestForm.css';
import api from '../../services/api';
import { LISTA_VEICULOS } from './ListaVeiculos.js';

import { useAlert } from '../../components/AlertContext/AlertContext';
import { useCargasContext } from '../../components/context/CargasContext.jsx'; 

// 🟢 1. IMPORTA O SOCKET
import { io } from 'socket.io-client';

// 🟢 2. CONFIGURA A URL DO SOCKET (Ajusta sozinho para localhost ou nuvem)
const SOCKET_URL = `http://${window.location.hostname}:3001`;
const socket = io(SOCKET_URL);

export default function RequestForm() {
  const { showAlert } = useAlert();
  const { cargasGlobais: cargas, setCargasGlobais: setCargas } = useCargasContext();

  const [carregando, setCarregando] = useState(false);
  const [dataHoje, setDataHoje] = useState('');
  const [dataMinima, setDataMinima] = useState('');

  const getSavedState = () => {
    try {
      const saved = sessionStorage.getItem('requestFormState');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  };
  const savedState = getSavedState();

  const [solicitante, setSolicitante] = useState(savedState.solicitante || '');
  const [pedidoCompra, setPedidoCompra] = useState(savedState.pedidoCompra || '');
  const [tipoOperacao, setTipoOperacao] = useState(savedState.tipoOperacao || '');
  const [veiculo, setVeiculo] = useState(savedState.veiculo || '');
  const [frete, setFrete] = useState(savedState.frete || '');
  const [nf, setNf] = useState(savedState.nf || '');
  const [obs, setObs] = useState(savedState.obs || '');

  const [enderecosFixos, setEnderecosFixos] = useState([]);
  const [enderecoColetaSelecionado, setEnderecoColetaSelecionado] = useState(savedState.enderecoColetaSelecionado || null);
  const [enderecoEntregaSelecionado, setEnderecoEntregaSelecionado] = useState(savedState.enderecoEntregaSelecionado || null);

  const [empresaColeta, setEmpresaColeta] = useState(savedState.empresaColeta || '');
  const [nomeContatoColeta, setNomeContatoColeta] = useState(savedState.nomeContatoColeta || '');
  const [telefoneColeta, setTelefoneColeta] = useState(savedState.telefoneColeta || '');
  const [dataColeta, setDataColeta] = useState(savedState.dataColeta || '');
  const [horaColeta, setHoraColeta] = useState(savedState.horaColeta || ''); 
  const [coleta, setColeta] = useState(savedState.coleta || { cep: '', logradouro: '', numero: '', bairro: '', localidade: '', uf: '' });

  const [empresaEntrega, setEmpresaEntrega] = useState(savedState.empresaEntrega || '');
  const [nomeContatoEntrega, setNomeContatoEntrega] = useState(savedState.nomeContatoEntrega || '');
  const [telefoneEntrega, setTelefoneEntrega] = useState(savedState.telefoneEntrega || '');
  const [dataEntrega, setDataEntrega] = useState(savedState.dataEntrega || '');
  const [horaEntrega, setHoraEntrega] = useState(savedState.horaEntrega || ''); 
  const [entrega, setEntrega] = useState(savedState.entrega || { cep: '', logradouro: '', numero: '', bairro: '', localidade: '', uf: '' });

  const [novaCarga, setNovaCarga] = useState({
    nome: '', quantidade: 1, peso: '', comprimento: '', largura: '', altura: '', cor: '#3b82f6'
  });
  const [cargasSelecionadas, setCargasSelecionadas] = useState([]);

  const [wbsSelecionada, setWbsSelecionada] = useState(savedState.wbsSelecionada || '');
  const [opcoesWbs, setOpcoesWbs] = useState([]);

  const [valorNfMask, setValorNfMask] = useState(savedState.valorNfMask || '');

  useEffect(() => {
    const stateToSave = {
      solicitante, pedidoCompra, tipoOperacao, veiculo, frete, nf, obs,
      wbsSelecionada,
      enderecoColetaSelecionado, empresaColeta, nomeContatoColeta, telefoneColeta, dataColeta, horaColeta, coleta,
      enderecoEntregaSelecionado, empresaEntrega, nomeContatoEntrega, telefoneEntrega, dataEntrega, horaEntrega, entrega,
      valorNfMask
    };
    sessionStorage.setItem('requestFormState', JSON.stringify(stateToSave));
  }, [
    solicitante, pedidoCompra, tipoOperacao, veiculo, frete, nf, obs,
    wbsSelecionada,
    enderecoColetaSelecionado, empresaColeta, nomeContatoColeta, telefoneColeta, dataColeta, horaColeta, coleta,
    enderecoEntregaSelecionado, empresaEntrega, nomeContatoEntrega, telefoneEntrega, dataEntrega, horaEntrega, entrega,
    valorNfMask
  ]);

  useEffect(() => {
    const hoje = new Date();
    setDataHoje(hoje.toLocaleDateString('pt-BR'));
    
    const timezoneOffset = hoje.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(hoje.getTime() - timezoneOffset)).toISOString().split('T')[0];
    setDataMinima(localISOTime);

    carregarProjetos();
    carregarEnderecos();

    socket.on('projetos_atualizados', () => {
      console.log('🔄 Lista de projetos alterada! Atualizando dropdown...');
      carregarProjetos();
    });

    socket.on('locais_atualizados', () => {
      console.log('🔄 Lista de locais alterada! Atualizando dropdown...');
      carregarEnderecos();
    });

    return () => {
      socket.off('projetos_atualizados');
      socket.off('locais_atualizados');
    };
  }, []);

  const carregarProjetos = async () => {
    try {
      const resposta = await api.get('/admin/projetos');
      const projetosMapeados = resposta.data.map(projeto => {
        const nomeExibicao = projeto.descricao || projeto.nome_projeto || projeto.wbs;
        return { value: projeto.wbs, label: nomeExibicao, dadosCompletos: projeto };
      });
      setOpcoesWbs(projetosMapeados);
    } catch (erro) {
      console.error("Erro ao carregar projetos:", erro);
      showAlert("Alerta de Sistema", "Não foi possível carregar a lista de projetos.", "warning");
    }
  };

  const carregarEnderecos = async () => {
    try {
      const resposta = await api.get('/admin/locais');
      const locaisOficiais = resposta.data.filter(local => local.is_comau !== false); 
      
      const opcoesFormatadas = locaisOficiais.map(local => ({
        value: local.id,
        label: `${local.nome_local} - ${local.municipio}/${local.uf}`,
        dadosCompletos: local
      }));

      opcoesFormatadas.push({ value: 'outro', label: 'Outro / Limpar Campos...' });
      setEnderecosFixos(opcoesFormatadas);
    } catch (erro) {
      console.error("Erro ao carregar endereços:", erro);
      setEnderecosFixos([{ value: 'outro', label: 'Limpar Campos...' }]);
    }
  };

  const handleSelectColeta = (opcao) => {
    setEnderecoColetaSelecionado(opcao);
    if (opcao && opcao.value !== 'outro') {
      const local = opcao.dadosCompletos;
      setEmpresaColeta(local.nome_local || '');
      setNomeContatoColeta(local.contato || '');
      setTelefoneColeta(local.telefone || '');
      setColeta({
        cep: local.cep || '', logradouro: local.logradouro || '', numero: local.numero || '',
        bairro: local.bairro || '', localidade: local.municipio || '', uf: local.uf || ''
      });
    } else {
      setEmpresaColeta(''); setNomeContatoColeta(''); setTelefoneColeta('');
      setColeta({ cep: '', logradouro: '', numero: '', bairro: '', localidade: '', uf: '' });
    }
  };

  const handleSelectEntrega = (opcao) => {
    setEnderecoEntregaSelecionado(opcao);
    if (opcao && opcao.value !== 'outro') {
      const local = opcao.dadosCompletos;
      setEmpresaEntrega(local.nome_local || '');
      setNomeContatoEntrega(local.contato || '');
      setTelefoneEntrega(local.telefone || '');
      setEntrega({
        cep: local.cep || '', logradouro: local.logradouro || '', numero: local.numero || '',
        bairro: local.bairro || '', localidade: local.municipio || '', uf: local.uf || ''
      });
    } else {
      setEmpresaEntrega(''); setNomeContatoEntrega(''); setTelefoneEntrega('');
      setEntrega({ cep: '', logradouro: '', numero: '', bairro: '', localidade: '', uf: '' });
    }
  };

  const aplicarMascaraTelefone = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (v.length <= 10) {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return v;
  };

  const aplicarMascaraMoeda = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (v === '') return '';
    v = (parseInt(v, 10) / 100).toFixed(2) + '';
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return v;
  };

  const buscarCep = async (valorCep, tipo) => {
    const cepLimpo = valorCep.replace(/\D/g, '');
    if (tipo === 'coleta') setColeta(prev => ({ ...prev, cep: valorCep }));
    else setEntrega(prev => ({ ...prev, cep: valorCep }));

    if (cepLimpo.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (data.erro) {
          showAlert("CEP não encontrado", `O CEP ${valorCep} não foi encontrado. Por favor, verifique ou preencha manualmente.`, "warning");
          return;
        }
        if (tipo === 'coleta') {
          setColeta(prev => ({ ...prev, logradouro: data.logradouro || '', bairro: data.bairro || '', localidade: data.localidade || '', uf: data.uf || '' }));
        } else if (tipo === 'entrega') {
          setEntrega(prev => ({ ...prev, logradouro: data.logradouro || '', bairro: data.bairro || '', localidade: data.localidade || '', uf: data.uf || '' }));
        }
      } catch (error) {
        showAlert("Erro de conexão", "Não foi possível buscar o CEP no momento. Preencha manualmente.", "error");
      }
    }
  };

  const handleAddCarga = () => {
    if (!novaCarga.nome || !novaCarga.quantidade || !novaCarga.peso || !novaCarga.comprimento || !novaCarga.largura || !novaCarga.altura) {
      showAlert("Campos Obrigatórios", "Por favor, preencha todos os campos da carga (Nome, Quantidade, Peso e Dimensões completas) antes de adicionar.", "warning");
      return;
    }
    setCargas([...cargas, { ...novaCarga, id: Date.now() }]);
    setNovaCarga({ nome: '', quantidade: 1, peso: '', comprimento: '', largura: '', altura: '', cor: '#3b82f6' });
  };

  const handleRemoveCarga = (id) => {
    setCargas(cargas.filter(carga => carga.id !== id));
    setCargasSelecionadas(cargasSelecionadas.filter(selecionadaId => selecionadaId !== id));
  };

  const handleToggleCarga = (id) => {
    if (cargasSelecionadas.includes(id)) {
      setCargasSelecionadas(cargasSelecionadas.filter(selecionadaId => selecionadaId !== id));
    } else {
      setCargasSelecionadas([...cargasSelecionadas, id]);
    }
  };

  const handleToggleAll = () => {
    if (cargasSelecionadas.length === cargas.length) {
      setCargasSelecionadas([]);
    } else {
      setCargasSelecionadas(cargas.map(carga => carga.id));
    }
  };

  const handleRemoveSelected = () => {
    setCargas(cargas.filter(carga => !cargasSelecionadas.includes(carga.id)));
    setCargasSelecionadas([]);
  };

  const limparFormularioCompleto = () => {
    sessionStorage.removeItem('requestFormState');
    setSolicitante('');
    setPedidoCompra('');
    setTipoOperacao('');
    setVeiculo('');
    setFrete('');
    setNf('');
    setObs('');
    setWbsSelecionada('');
    setEnderecoColetaSelecionado(null);
    setEnderecoEntregaSelecionado(null);
    setEmpresaColeta(''); setEmpresaEntrega('');
    setNomeContatoColeta(''); setNomeContatoEntrega('');
    setDataColeta(''); setDataEntrega('');
    setHoraColeta(''); setHoraEntrega('');
    setTelefoneColeta(''); setTelefoneEntrega('');
    setColeta({ cep: '', logradouro: '', numero: '', bairro: '', localidade: '', uf: '' });
    setEntrega({ cep: '', logradouro: '', numero: '', bairro: '', localidade: '', uf: '' });
    setValorNfMask('');
    setCargas([]); 
    setCargasSelecionadas([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (dataColeta && dataColeta < dataMinima) {
      showAlert("Data Inválida", "A Data de Coleta não pode ser anterior ao dia de hoje.", "warning");
      return;
    }

    if (dataEntrega && dataEntrega < dataMinima) {
      showAlert("Data Inválida", "A Data de Entrega não pode ser anterior ao dia de hoje.", "warning");
      return;
    }

    if (cargas.length === 0) {
      showAlert("Atenção", "Você precisa adicionar pelo menos uma carga na lista antes de salvar a solicitação.", "warning");
      return;
    }

    if (!wbsSelecionada) {
      showAlert("Atenção", "Por favor, selecione o Projeto / WBS.", "warning");
      return;
    }

    setCarregando(true);

    const formData = new FormData(e.target);
    const dados = Object.fromEntries(formData.entries());

    dados.dataSolicitacao = dataHoje; 
    
    if (dados.dataColeta) {
      dados.dataColeta = dados.dataColeta.split('-').reverse().join('/');
    }
    if (dados.dataEntrega) {
      dados.dataEntrega = dados.dataEntrega.split('-').reverse().join('/');
    }

    dados.listaCargas = JSON.stringify(cargas);
    dados.pesoTotal = cargas.reduce((acc, curr) => acc + (parseFloat(curr.peso || 0) * parseInt(curr.quantidade || 1)), 0);
    dados.quantidadeVolumes = cargas.reduce((acc, curr) => acc + parseInt(curr.quantidade || 1), 0);

    try {
      const resposta = await api.post('/transportes', dados);
      
      const idAtm = resposta.data.numero_atm || resposta.data.id_gerado.substring(0, 8).toUpperCase();
      
      showAlert(
        "SUCESSO!", 
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <span>O transporte foi solicitado com sucesso!</span>
          <br /><br />
          <strong style={{ 
            fontSize: '1.5rem', color: '#065f46', backgroundColor: '#d1fae5', 
            padding: '10px 15px', borderRadius: '8px', display: 'inline-block', border: '2px dashed #10b981'
          }}>
            NÚMERO DO ATM: #{idAtm}
          </strong>
          <br /><br />
        </div>, 
        "success"
      );
      
      window.scrollTo({ top: 0, behavior: 'smooth' });

      limparFormularioCompleto();
      e.target.reset();

    } catch (erro) {
      console.error("Erro no envio:", erro);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (erro.response) {
        const status = erro.response.status;
        if (status === 404) {
          showAlert("Erro 404", "O endereço /api/transportes não foi encontrado no servidor.", "error");
        } else {
          showAlert("Ops!", `Erro ${status}: ${erro.response.data.erro || "Falha no servidor"}`, "error");
        }
      } else if (erro.request) {
        showAlert("Sem Conexão", "O servidor não respondeu.", "error");
      } else {
        showAlert("Erro Interno", "Falha ao configurar a requisição: " + erro.message, "error");
      }
    } finally {
      setCarregando(false);
    }
  };

  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: '0.5rem',
      minHeight: '42px',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
      '&:hover': { borderColor: '#3b82f6' }
    }),
    menu: (base) => ({ ...base, zIndex: 9999 })
  };

  return (
    <>
      <AbaSimulacao />

      <section className="form-card fade-in">
        <div className="card-header">
          <h3 className="card-title">Solicitação de Transporte</h3>
          <div className="badge-info"><i className="fa-solid fa-clock"></i> Preencha os dados</div>
        </div>

        <form onSubmit={handleSubmit}>

          <h4 className="section-title"><i className="fa-solid fa-user-tag"></i> Dados do Solicitante</h4>
          <div className="form-grid-4">
            <div className="input-group">
              <label>Nome e sobrenome *</label>
              <input type="text" name="solicitante" value={solicitante} onChange={e => setSolicitante(e.target.value)} required className="input-control" placeholder="Seu nome" />
            </div>
            <div className="input-group">
              <label>Data da Solicitação</label>
              <input type="text" value={dataHoje} readOnly className="input-control" />
            </div>
            <div className="input-group">
              {/* 🟢 REMOVIDO: required e asterisco (*) */}
              <label>Nº do Pedido ou PS</label>
              <input type="text" name="pedidoCompra" value={pedidoCompra} onChange={e => setPedidoCompra(e.target.value)} className="input-control" placeholder="(opcional)" />
            </div>
            <div className="input-group">
              <label>Tipo de Operação *</label>
              <select name="tipo_operacao" value={tipoOperacao} onChange={e => setTipoOperacao(e.target.value)} required className="input-control">
                <option value="" disabled>Selecione...</option>
                <option value="Nacional">NACIONAL</option>
                <option value="Nacionalizado">NACIONALIZADO</option>
              </select>
            </div>
          </div>

          <div>
            <div className="input-group" style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
              <label>Projeto / WBS *</label>
              <input type="hidden" name="wbs" value={wbsSelecionada} required />
              <Select
                options={opcoesWbs}
                value={opcoesWbs.find(opt => opt.value === wbsSelecionada) || null}
                onChange={(selecionado) => setWbsSelecionada(selecionado ? selecionado.value : '')}
                placeholder={opcoesWbs.length === 0 ? "Carregando projetos..." : "Busque pelo nome do projeto ou WBS..."}
                isSearchable
                isClearable
                styles={reactSelectStyles}
              />
            </div>
          </div>

          <h4 className="section-title" style={{ marginTop: '2rem' }}><i className="fa-solid fa-map-location-dot"></i> Rota e Prazos</h4>

          {/* Origem */}
          <div className="box-highlight" style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ color: '#1e40af', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Dados para o local de coleta</h5>

            <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="input-group">
                    <label>Selecione um local cadastrado (ou preencha abaixo)</label>
                    <Select
                        options={enderecosFixos}
                        value={enderecoColetaSelecionado}
                        onChange={handleSelectColeta}
                        placeholder="Ex: COMAU SP..."
                        isSearchable
                        isClearable
                        styles={reactSelectStyles}
                    />
                </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
              <div className="input-group">
                <label>Contato de Coleta *</label>
                <input type="text" name="nomeContatoColeta" value={nomeContatoColeta} onChange={e => setNomeContatoColeta(e.target.value)} required className="input-control" placeholder="Nome e Sobrenome do responsável" />
              </div>
              <div className="input-group">
                <label>Telefone da Coleta *</label>
                <input type="tel" name="telefoneColeta" value={telefoneColeta} onChange={(e) => setTelefoneColeta(aplicarMascaraTelefone(e.target.value))} maxLength="15" required className="input-control" placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label>Empresa de Coleta *</label>
                <input type="text" name="empresaColeta" value={empresaColeta} onChange={e => setEmpresaColeta(e.target.value)} required className="input-control" placeholder="Nome do Fornecedor" />
              </div>
              
              <div className="input-group">
                <label>Data e Hora Coleta * <small style={{fontWeight: 'normal', color: '#64748b'}}>(Hora opcional)</small></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="date" 
                    name="dataColeta" 
                    value={dataColeta} 
                    onChange={(e) => setDataColeta(e.target.value)} 
                    min={dataMinima} 
                    required 
                    className="input-control" 
                    onKeyDown={(e) => e.preventDefault()}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    style={{ cursor: 'pointer', flex: '2' }}
                  />
                  <input 
                    type="time" 
                    name="horaColeta" 
                    value={horaColeta} 
                    onChange={(e) => setHoraColeta(e.target.value)} 
                    className="input-control" 
                    style={{ cursor: 'pointer', flex: '1' }}
                    title="Defina o horário limite ou desejado para coleta (Opcional)"
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-4" style={{ marginTop: '1rem' }}>
              <div className="input-group">
                  <label>CEP (Apenas números) *</label>
                  <input type="text" name="cepColeta" maxLength="9" value={coleta.cep} onChange={(e) => buscarCep(e.target.value, 'coleta')} required className="input-control" placeholder="00000000" />
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label>Logradouro (Rua/Av) *</label>
                  <input type="text" name="logradouroColeta" required value={coleta.logradouro} onChange={(e) => setColeta({ ...coleta, logradouro: e.target.value })} className="input-control" />
              </div>
              <div className="input-group">
                  <label>Número / Compl.</label>
                  <input type="text" name="numeroColeta" value={coleta.numero} onChange={(e) => setColeta({ ...coleta, numero: e.target.value })} className="input-control" />
              </div>
            </div>
            <div className="form-grid-3">
              <div className="input-group">
                  <label>Bairro</label>
                  <input type="text" name="bairroColeta" value={coleta.bairro} onChange={(e) => setColeta({ ...coleta, bairro: e.target.value })} className="input-control" />
              </div>
              <div className="input-group">
                  <label>Cidade *</label>
                  <input type="text" name="cidadeColeta" required value={coleta.localidade} onChange={(e) => setColeta({ ...coleta, localidade: e.target.value })} className="input-control" />
              </div>
              <div className="input-group">
                  <label>UF *</label>
                  <input type="text" name="ufColeta" maxLength="2" required value={coleta.uf} onChange={(e) => setColeta({ ...coleta, uf: e.target.value })} className="input-control" />
              </div>
            </div>
          </div>

          {/* Destino */}
          <div className="box-highlight" style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ color: '#166534', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Dados para o local de entrega</h5>

            <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="input-group">
                    <label>Selecione um local cadastrado (ou preencha abaixo)</label>
                    <Select
                        options={enderecosFixos}
                        value={enderecoEntregaSelecionado}
                        onChange={handleSelectEntrega}
                        placeholder="Ex: COMAU MG..."
                        isSearchable
                        isClearable
                        styles={reactSelectStyles}
                    />
                </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
              <div className="input-group">
                <label>Contato de Entrega *</label>
                <input type="text" name="nomeContatoEntrega" value={nomeContatoEntrega} onChange={e => setNomeContatoEntrega(e.target.value)} required className="input-control" placeholder="Nome e Sobrenome do destinatário" />
              </div>
              <div className="input-group">
                <label>Telefone da Entrega *</label>
                <input type="tel" name="telefoneEntrega" value={telefoneEntrega} onChange={(e) => setTelefoneEntrega(aplicarMascaraTelefone(e.target.value))} maxLength="15" required className="input-control" placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label>Empresa de Entrega / Setor *</label>
                <input type="text" name="empresaEntrega" value={empresaEntrega} onChange={e => setEmpresaEntrega(e.target.value)} required className="input-control" placeholder="Destinatário final" />
              </div>
              
              <div className="input-group">
                <label>Data e Hora Entrega * <small style={{fontWeight: 'normal', color: '#64748b'}}>(Hora opcional)</small></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="date" 
                    name="dataEntrega" 
                    value={dataEntrega} 
                    onChange={(e) => setDataEntrega(e.target.value)} 
                    min={dataMinima} 
                    required 
                    className="input-control" 
                    onKeyDown={(e) => e.preventDefault()}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    style={{ cursor: 'pointer', flex: '2' }}
                  />
                  <input 
                    type="time" 
                    name="horaEntrega" 
                    value={horaEntrega} 
                    onChange={(e) => setHoraEntrega(e.target.value)} 
                    className="input-control" 
                    style={{ cursor: 'pointer', flex: '1' }}
                    title="Defina o horário limite ou desejado para entrega (Opcional)"
                  />
                </div>
              </div>
            </div>
            
            <div className="form-grid-4" style={{ marginTop: '1rem' }}>
              <div className="input-group">
                  <label>CEP (Apenas números) *</label>
                  <input type="text" name="cepEntrega" maxLength="9" value={entrega.cep} onChange={(e) => buscarCep(e.target.value, 'entrega')} required className="input-control" placeholder="00000000" />
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label>Logradouro (Rua/Av) *</label>
                  <input type="text" name="logradouroEntrega" required value={entrega.logradouro} onChange={(e) => setEntrega({ ...entrega, logradouro: e.target.value })} className="input-control" />
              </div>
              <div className="input-group">
                  <label>Número / Compl.</label>
                  <input type="text" name="numeroEntrega" value={entrega.numero} onChange={(e) => setEntrega({ ...entrega, numero: e.target.value })} className="input-control" />
              </div>
            </div>
            <div className="form-grid-3">
              <div className="input-group">
                  <label>Bairro</label>
                  <input type="text" name="bairroEntrega" value={entrega.bairro} onChange={(e) => setEntrega({ ...entrega, bairro: e.target.value })} className="input-control" />
              </div>
              <div className="input-group">
                  <label>Cidade *</label>
                  <input type="text" name="cidadeEntrega" required value={entrega.localidade} onChange={(e) => setEntrega({ ...entrega, localidade: e.target.value })} className="input-control" />
              </div>
              <div className="input-group">
                  <label>UF *</label>
                  <input type="text" name="ufEntrega" maxLength="2" required value={entrega.uf} onChange={(e) => setEntrega({ ...entrega, uf: e.target.value })} className="input-control" />
              </div>
            </div>
          </div>

          <h4 className="section-title"><i className="fa-solid fa-box-open"></i> Características e Logística</h4>

          <div className="box-highlight" style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
            <h5 style={{ color: '#475569', fontWeight: 'bold', marginBottom: '1rem' }}>Adicionar Carga</h5>

            <div className="form-grid-4">
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label>Nome / Descrição da Carga *</label>
                <input type="text" value={novaCarga.nome} onChange={e => setNovaCarga({ ...novaCarga, nome: e.target.value })} className="input-control" placeholder="Ex: Pallet de Eletrônicos" />
              </div>
              <div className="input-group">
                <label>Quantidade *</label>
                <input type="number" min="1" value={novaCarga.quantidade} onChange={e => setNovaCarga({ ...novaCarga, quantidade: e.target.value })} className="input-control" />
              </div>
              <div className="input-group">
                <label>Cor de Identificação *</label>
                <input type="color" value={novaCarga.cor} onChange={e => setNovaCarga({ ...novaCarga, cor: e.target.value })} className="input-control" style={{ height: '42px', padding: '2px', cursor: 'pointer' }} />
              </div>
            </div>

            <div className="form-grid-4" style={{ marginTop: '1rem' }}>
              <div className="input-group">
                <label>Peso Unitário (kg) *</label>
                <input type="number" step="0.01" min="0" value={novaCarga.peso} onChange={e => setNovaCarga({ ...novaCarga, peso: e.target.value })} className="input-control" placeholder="Ex: 150.5" />
              </div>
              <div className="input-group">
                <label>Comprimento (m) *</label>
                <input type="number" step="0.01" min="0" value={novaCarga.comprimento} onChange={e => setNovaCarga({ ...novaCarga, comprimento: e.target.value })} className="input-control" placeholder="Ex: 2.0" />
              </div>
              <div className="input-group">
                <label>Largura (m) *</label>
                <input type="number" step="0.01" min="0" value={novaCarga.largura} onChange={e => setNovaCarga({ ...novaCarga, largura: e.target.value })} className="input-control" placeholder="Ex: 1.0" />
              </div>
              <div className="input-group">
                <label>Altura (m) *</label>
                <input type="number" step="0.01" min="0" value={novaCarga.altura} onChange={e => setNovaCarga({ ...novaCarga, altura: e.target.value })} className="input-control" placeholder="Ex: 1.5" />
              </div>
            </div>

            <button type="button" onClick={handleAddCarga} className="btn btn-primary" style={{ marginTop: '1rem', backgroundColor: '#3b82f6', border: 'none' }}>
              <i className="fa-solid fa-plus"></i> Adicionar à Lista
            </button>

            {cargas.length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={cargasSelecionadas.length === cargas.length && cargas.length > 0}
                      onChange={handleToggleAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      title="Selecionar todas as cargas"
                    />
                    <h6 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>
                      Cargas Prontas para Envio ({cargas.length})
                    </h6>
                  </div>

                  {cargasSelecionadas.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRemoveSelected}
                      style={{
                        backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem',
                        borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                      }}
                    >
                      <i className="fa-solid fa-trash-can"></i> Remover Selecionados ({cargasSelecionadas.length})
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {cargas.map((carga) => (
                    <div
                      key={carga.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: cargasSelecionadas.includes(carga.id) ? '#f0f9ff' : '#ffffff',
                        borderLeft: `6px solid ${carga.cor}`, padding: '0.75rem 1rem',
                        borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'background-color 0.2s'
                      }}
                    >

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="checkbox"
                          checked={cargasSelecionadas.includes(carga.id)}
                          onChange={() => handleToggleCarga(carga.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <div>
                          <strong style={{ display: 'block', color: '#1e293b', fontSize: '1rem' }}>{carga.nome} (x{carga.quantidade})</strong>
                          <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            Peso Unitário: {carga.peso}kg {carga.comprimento && `| Dimensões: ${carga.comprimento}m x ${carga.largura}m x ${carga.altura}m`}
                          </small>
                        </div>
                      </div>

                      <button type="button" onClick={() => handleRemoveCarga(carga.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }} title="Remover esta carga">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-grid-4">
            <div className="input-group">
              <label>Veículo *</label>
              <select name="veiculo" value={veiculo} onChange={e => setVeiculo(e.target.value)} required className="input-control">
                <option value="">Selecione...</option>
                {LISTA_VEICULOS.map((veiculoItem, index) => (
                  <option key={index} value={veiculoItem}>
                    {veiculoItem}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Tipo de Frete *</label>
              <select name="frete" value={frete} onChange={e => setFrete(e.target.value)} required className="input-control">
                <option value="">Selecione...</option>
                <option value="Dedicado">DEDICADO</option>
                <option value="Fracionado">FRACIONADO</option>
                <option value="REDESPACHO/FRACIONADO">REDESPACHO/FRACIONADO</option>
                <option value="DIÁRIA/VIAGEM">DIÁRIA/VIAGEM</option>
                <option value="DEDICADO/FRACIONADO">DEDICADO/FRACIONADO</option>
              </select>
            </div>

            <div className="input-group">
              <label>Nota Fiscal</label>
              <input type="text" name="nf" value={nf} onChange={e => setNf(e.target.value)} className="input-control" placeholder="opcional" />
            </div>

            <div className="input-group">
              <label>Valor da NF (R$) *</label>
              <input
                type="text"
                required
                className="input-control"
                placeholder="0,00"
                value={valorNfMask}
                onChange={(e) => setValorNfMask(aplicarMascaraMoeda(e.target.value))}
              />
              <input 
                type="hidden" 
                name="valor_nf" 
                value={valorNfMask ? valorNfMask.replace(/\./g, '').replace(',', '.') : ''} 
              />
            </div>

          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Observações Adicionais</label>
            <textarea name="obs" value={obs} onChange={e => setObs(e.target.value)} rows="3" className="input-control" placeholder="Instruções especiais, restrições de horário, etc."></textarea>
          </div>

          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={limparFormularioCompleto}>Limpar</button>
            <button type="submit" disabled={carregando} className="btn btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> {carregando ? 'Salvando...' : 'Salvar Solicitação'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
