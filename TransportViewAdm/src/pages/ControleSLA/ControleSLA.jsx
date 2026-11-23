import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import './ControleSLA.css';

const KEY_REGISTROS = 'comau_sla_registros_v2';
const KEY_TRANSPORTADORAS = 'comau_sla_transportadoras_v2';
const KEY_MIGRACAO_BANCO = 'comau_sla_migracao_banco_v1';
const PERCENTUAL_PENALIDADE = 0.08;
const TARGET_ACEITAVEL = 0.90;
const DIAS_UTEIS_FRACIONADO = 7;
const LINHAS_POR_PAGINA = 20;

const PESOS_INDICADORES = Object.freeze({
  Coleta: 0.25,
  Entrega: 0.25,
  Resposta: 0.10,
  Frota: 0.15,
  'Ocorrência': 0.25,
});

const NOMES_INDICADORES = Object.keys(PESOS_INDICADORES);

function lerListaLocalStorage(chave) {
  try {
    const valor = window.localStorage.getItem(chave);
    if (!valor) return [];
    const dados = JSON.parse(valor);
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error(`Não foi possível ler ${chave} do armazenamento local:`, erro);
    return [];
  }
}

function gerarIdCliente() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sla-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function normalizarRegistroDaApi(registro) {
  const indicadores = registro.indicadoresOcorrencia || registro.indicadores_ocorrencia ||
    registro.indicadoresNaoConformes || registro.indicadores_nao_conformes || [];
  const indicadoresOk = registro.indicadoresOk || registro.indicadores_ok || [];
  return {
    ...registro,
    modalidade: registro.modalidade || 'Dedicado',
    data: registro.data || registro.dataRegistro || registro.data_registro || '',
    processo: registro.processo || registro.viagem || '',
    viagem: registro.viagem || registro.processo || '',
    frete: Number(registro.frete || 0),
    indicadoresOcorrencia: Array.isArray(indicadores) ? indicadores : [],
    indicadoresNaoConformes: Array.isArray(indicadores) ? indicadores : [],
    indicadoresOk: Array.isArray(indicadoresOk) ? indicadoresOk : [],
    tipoOcorrencia: registro.tipoOcorrencia || registro.tipo_ocorrencia || '',
    pontuacao: Number(registro.pontuacao ?? 1),
    desconto: Number(registro.desconto || 0),
    freteLiquido: Number(registro.freteLiquido ?? registro.frete_liquido ?? registro.frete ?? 0),
    criadoEm: registro.criadoEm || registro.criado_em || registro.created || '',
  };
}

function mensagemErroApi(erro, padrao) {
  return erro?.response?.data?.erro || erro?.response?.data?.message || erro?.message || padrao;
}

async function migrarDadosLocaisParaBanco() {
  if (window.localStorage.getItem(KEY_MIGRACAO_BANCO) === 'concluida') return false;

  const transportadorasLocais = lerListaLocalStorage(KEY_TRANSPORTADORAS)
    .filter((nome) => typeof nome === 'string' && nome.trim());
  const registrosOriginais = lerListaLocalStorage(KEY_REGISTROS);
  const registrosLocais = registrosOriginais.map((registro) => ({
    ...registro,
    client_id: registro.client_id || registro.clientId || gerarIdCliente(),
  }));

  // Preserva os identificadores no navegador para permitir repetir a migração sem duplicar dados.
  if (registrosLocais.length) {
    window.localStorage.setItem(KEY_REGISTROS, JSON.stringify(registrosLocais));
  }

  for (const nome of transportadorasLocais) {
    await api.post('/admin/controle-sla/transportadoras', { nome: nome.trim() });
  }

  if (registrosLocais.length) {
    await api.post('/admin/controle-sla/registros/importacao-local', { registros: registrosLocais });
  }

  window.localStorage.setItem(KEY_MIGRACAO_BANCO, 'concluida');
  return registrosLocais.length > 0 || transportadorasLocais.length > 0;
}

function dataHojeLocal() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function dataLocal(valor) {
  if (!valor) return null;
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  const data = new Date(ano, mes - 1, dia);
  return Number.isNaN(data.getTime()) ? null : data;
}

function dataBR(valor) {
  const data = dataLocal(valor);
  return data ? data.toLocaleDateString('pt-BR') : '-';
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function percentual(valor, casas = 1) {
  return `${(Number(valor || 0) * 100).toFixed(casas).replace('.', ',')}%`;
}

function pesoDosIndicadores(lista = []) {
  return lista.reduce((total, indicador) => total + (PESOS_INDICADORES[indicador] || 0), 0);
}

function indicadoresDoRegistro(registro) {
  if (Array.isArray(registro.indicadoresOcorrencia)) {
    return [...new Set(registro.indicadoresOcorrencia.filter((item) => PESOS_INDICADORES[item]))];
  }

  if (Array.isArray(registro.indicadoresNaoConformes)) {
    return [...new Set(registro.indicadoresNaoConformes.filter((item) => PESOS_INDICADORES[item]))];
  }

  if (Array.isArray(registro.indicadoresOk)) {
    return NOMES_INDICADORES.filter((item) => !registro.indicadoresOk.includes(item));
  }

  if (registro.tipoOcorrencia) {
    return [...new Set(
      String(registro.tipoOcorrencia)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => PESOS_INDICADORES[item]),
    )];
  }

  const indicadores = [];
  if (registro.coleta && registro.coleta !== 'OK') indicadores.push('Coleta');
  if (registro.entrega && registro.entrega !== 'OK') indicadores.push('Entrega');
  if (registro.resposta && registro.resposta !== 'OK' && registro.resposta !== 'Não se aplica') {
    indicadores.push('Resposta');
  }
  if (registro.frota && registro.frota !== 'OK') indicadores.push('Frota');
  if (registro.ocorrencia === 'Sim') indicadores.push('Ocorrência');
  return [...new Set(indicadores)];
}

function registroEhOcorrencia(registro) {
  return indicadoresDoRegistro(registro).length > 0;
}

function percentualTotalOcorrencia(registro) {
  return `${(pesoDosIndicadores(indicadoresDoRegistro(registro)) * 100).toFixed(0)}%`;
}

function idDoProcesso(registro) {
  const identificador = registro.processo || registro.viagem || registro.id ||
    `${registro.data || registro.dataRegistro || ''}-${registro.evento || ''}`;
  // O mesmo número de NF pode existir em transportadoras diferentes.
  return `${registro.transportadora || 'Sem transportadora'}::${identificador}`;
}

function registroTemPenalidade(registro) {
  return Boolean(registro.penalidade && registro.penalidade !== 'Não');
}

function descontoDoRegistro(registro) {
  if (registro.desconto !== undefined && registro.desconto !== null && registro.desconto !== '') {
    return Number(registro.desconto) || 0;
  }
  return registroTemPenalidade(registro) ? Number(registro.frete || 0) * PERCENTUAL_PENALIDADE : 0;
}

function calcularMetricas(lista) {
  const ocorrenciasValidas = lista.filter(registroEhOcorrencia);
  const porProcesso = new Map();

  ocorrenciasValidas.forEach((registro) => {
    const id = idDoProcesso(registro);
    if (!porProcesso.has(id)) {
      porProcesso.set(id, {
        id,
        indicadores: new Set(),
        registros: [],
        noShow: false,
        desconto: 0,
        frete: 0,
      });
    }

    const processo = porProcesso.get(id);
    indicadoresDoRegistro(registro).forEach((indicador) => processo.indicadores.add(indicador));
    processo.registros.push(registro);
    processo.noShow = processo.noShow ||
      registro.penalidade === 'No Show' ||
      registro.coleta === 'No Show' ||
      registro.frota === 'No Show' ||
      /no show/i.test(registro.evento || '');
    processo.desconto = Math.max(processo.desconto, descontoDoRegistro(registro));
    processo.frete = Math.max(processo.frete, Number(registro.frete || 0));
  });

  const processos = [...porProcesso.values()];
  const totalProcessos = processos.length;
  const impacto = Object.fromEntries(NOMES_INDICADORES.map((item) => [item, 0]));
  const processosPorIndicador = Object.fromEntries(NOMES_INDICADORES.map((item) => [item, 0]));

  processos.forEach((processo) => {
    processo.indicadores.forEach((indicador) => {
      impacto[indicador] += PESOS_INDICADORES[indicador] || 0;
      processosPorIndicador[indicador] += 1;
    });
  });

  const perdaTotal = processos.reduce(
    (total, processo) => total + pesoDosIndicadores([...processo.indicadores]),
    0,
  );
  const indice = totalProcessos
    ? Math.max(0, 1 - Math.min(1, perdaTotal / totalProcessos))
    : 1;

  return {
    registros: ocorrenciasValidas,
    processos,
    processosNaoConforme: totalProcessos,
    ocorrencias: ocorrenciasValidas.length,
    noshow: processos.filter((processo) => processo.noShow).length,
    frete: processos.reduce((total, processo) => total + processo.frete, 0),
    descontos: processos.reduce((total, processo) => total + processo.desconto, 0),
    indice,
    impacto,
    processosPorIndicador,
  };
}

function intervaloPeriodo(tipo, referencia) {
  if (tipo === 'todos' || !referencia) return null;
  const data = dataLocal(referencia);
  if (!data) return null;

  if (tipo === 'ano') {
    return {
      inicio: new Date(data.getFullYear(), 0, 1),
      fim: new Date(data.getFullYear() + 1, 0, 1),
    };
  }

  if (tipo === 'mes') {
    return {
      inicio: new Date(data.getFullYear(), data.getMonth(), 1),
      fim: new Date(data.getFullYear(), data.getMonth() + 1, 1),
    };
  }

  const diaSemana = data.getDay();
  const distanciaSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicio = new Date(data);
  inicio.setDate(data.getDate() - distanciaSegunda);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 7);
  return { inicio, fim };
}

function resumoDoFiltro(filtros) {
  const faixa = intervaloPeriodo(filtros.periodo, filtros.dataReferencia);
  let periodo = 'todos os registros';
  if (faixa) {
    const ultimoDia = new Date(faixa.fim);
    ultimoDia.setDate(ultimoDia.getDate() - 1);
    periodo = `${faixa.inicio.toLocaleDateString('pt-BR')} a ${ultimoDia.toLocaleDateString('pt-BR')}`;
  }

  return `Período: ${periodo} | Transportadora: ${filtros.transportadora} | Modalidade: ${filtros.modalidade}`;
}

function nomeArquivoData() {
  return dataHojeLocal();
}

function baixarCSV(nomeArquivo, linhas) {
  const conteudo = linhas
    .map((linha) => linha.map((valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`).join(';'))
    .join('\r\n');
  const blob = new Blob(['\ufeff', conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function adicionarAbaExcel(workbook, nome, linhas, larguras = []) {
  const worksheet = XLSX.utils.aoa_to_sheet(linhas);
  if (larguras.length) worksheet['!cols'] = larguras.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, worksheet, nome);
}

const FORMULARIO_INICIAL = () => ({
  modalidade: 'Dedicado',
  data: dataHojeLocal(),
  transportadora: '',
  processo: '',
  frete: '',
  evento: '',
  penalidade: 'Não',
  observacao: '',
});

export default function ControleSLA() {
  const [activeTab, setActiveTab] = useState('registro');
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraIds, setTransportadoraIds] = useState({});
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [apiDisponivel, setApiDisponivel] = useState(false);
  const [avisoApi, setAvisoApi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState(FORMULARIO_INICIAL);
  const [indicadoresSelecionados, setIndicadoresSelecionados] = useState([]);
  const [novaTransportadora, setNovaTransportadora] = useState('');
  const [mensagemRegistro, setMensagemRegistro] = useState({ texto: '', tipo: '' });
  const [mensagemTransportadora, setMensagemTransportadora] = useState({ texto: '', tipo: '' });
  const [paginaDetalhamento, setPaginaDetalhamento] = useState(1);
  const [filtros, setFiltros] = useState({
    periodo: 'todos',
    dataReferencia: dataHojeLocal(),
    transportadora: 'Todas',
    modalidade: 'Todas',
  });

  useEffect(() => {
    let ativo = true;

    const carregarDados = async () => {
      setCarregando(true);
      setAvisoApi('');
      try {
        let avisoMigracao = '';
        try {
          const migrou = await migrarDadosLocaisParaBanco();
          if (migrou) avisoMigracao = 'Os dados antigos deste navegador foram enviados ao banco central.';
        } catch (erroMigracao) {
          console.error('Falha ao migrar dados locais do Controle SLA:', erroMigracao);
          avisoMigracao = `Não foi possível concluir a migração dos dados antigos: ${mensagemErroApi(erroMigracao, 'erro desconhecido')}. A migração será tentada novamente na próxima abertura.`;
        }

        const [respostaRegistros, respostaTransportadoras] = await Promise.all([
          api.get('/admin/controle-sla/registros'),
          api.get('/admin/controle-sla/transportadoras'),
        ]);

        if (!ativo) return;
        const listaRegistros = Array.isArray(respostaRegistros.data) ? respostaRegistros.data : [];
        const listaTransportadoras = Array.isArray(respostaTransportadoras.data) ? respostaTransportadoras.data : [];
        setRegistros(listaRegistros.map(normalizarRegistroDaApi));
        setTransportadoras(listaTransportadoras.map((item) => item.nome).filter(Boolean));
        setTransportadoraIds(Object.fromEntries(listaTransportadoras.map((item) => [item.nome, item.id])));
        setApiDisponivel(true);
        setAvisoApi(avisoMigracao);
      } catch (erro) {
        console.error('Erro ao carregar dados do Controle SLA:', erro);
        if (!ativo) return;
        setApiDisponivel(false);
        setAvisoApi(`Não foi possível conectar ao banco de dados do SLA. ${mensagemErroApi(erro, 'Verifique se o backend está ativo e se a rota foi registrada no server.js.')}`);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregarDados();
    return () => { ativo = false; };
  }, []);

  const pesoSelecionado = useMemo(
    () => pesoDosIndicadores(indicadoresSelecionados),
    [indicadoresSelecionados],
  );
  const pontuacaoSelecionada = Math.max(0, 1 - pesoSelecionado);
  const dentroDoTarget = pontuacaoSelecionada >= TARGET_ACEITAVEL;

  const registrosFiltrados = useMemo(() => {
    const faixa = intervaloPeriodo(filtros.periodo, filtros.dataReferencia);
    return registros.filter((registro) => {
      const data = dataLocal(registro.data || registro.dataRegistro);
      const dentroDoPeriodo = !faixa || (data && data >= faixa.inicio && data < faixa.fim);
      const dentroDaTransportadora = filtros.transportadora === 'Todas' ||
        (registro.transportadora || 'Sem transportadora') === filtros.transportadora;
      const dentroDaModalidade = filtros.modalidade === 'Todas' ||
        (registro.modalidade || 'Dedicado') === filtros.modalidade;
      return dentroDoPeriodo && dentroDaTransportadora && dentroDaModalidade && registroEhOcorrencia(registro);
    });
  }, [registros, filtros]);

  const metricas = useMemo(() => calcularMetricas(registrosFiltrados), [registrosFiltrados]);
  const resumoFiltro = useMemo(() => resumoDoFiltro(filtros), [filtros]);

  const dadosPorTransportadora = useMemo(() => {
    const grupos = new Map();
    registrosFiltrados.forEach((registro) => {
      const nome = registro.transportadora || 'Sem transportadora';
      if (!grupos.has(nome)) grupos.set(nome, []);
      grupos.get(nome).push(registro);
    });
    return [...grupos.entries()].map(([nome, lista]) => [nome, calcularMetricas(lista)]);
  }, [registrosFiltrados]);

  const ranking = useMemo(
    () => [...dadosPorTransportadora].sort((a, b) => b[1].processosNaoConforme - a[1].processosNaoConforme),
    [dadosPorTransportadora],
  );

  const descontosPorTransportadora = useMemo(
    () => [...dadosPorTransportadora].sort((a, b) => b[1].descontos - a[1].descontos),
    [dadosPorTransportadora],
  );

  const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / LINHAS_POR_PAGINA));
  const paginaAtual = Math.min(paginaDetalhamento, totalPaginas);
  const inicioPagina = (paginaAtual - 1) * LINHAS_POR_PAGINA;
  const registrosDaPagina = registrosFiltrados.slice(inicioPagina, inicioPagina + LINHAS_POR_PAGINA);

  useEffect(() => {
    setPaginaDetalhamento(1);
  }, [filtros.periodo, filtros.dataReferencia, filtros.transportadora, filtros.modalidade]);

  const atualizarFormulario = (campo, valor) => {
    setFormData((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const atualizarFiltro = (campo, valor) => {
    setFiltros((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const alternarIndicador = (indicador) => {
    setIndicadoresSelecionados((anterior) => (
      anterior.includes(indicador)
        ? anterior.filter((item) => item !== indicador)
        : [...anterior, indicador]
    ));
  };

  const handleRegistrar = async (evento) => {
    evento.preventDefault();

    if (!apiDisponivel) {
      setMensagemRegistro({ texto: 'O banco de dados não está conectado. Não é possível registrar agora.', tipo: 'error' });
      return;
    }
    if (!transportadoras.length) {
      setMensagemRegistro({ texto: 'Cadastre uma transportadora antes de registrar a ocorrência.', tipo: 'error' });
      setActiveTab('transportadoras');
      return;
    }
    if (!formData.transportadora.trim()) {
      setMensagemRegistro({ texto: 'Selecione uma transportadora.', tipo: 'error' });
      return;
    }
    if (!formData.processo.trim()) {
      setMensagemRegistro({ texto: 'Informe o processo, NF ou número da viagem.', tipo: 'error' });
      return;
    }
    if (!indicadoresSelecionados.length) {
      setMensagemRegistro({ texto: 'Marque pelo menos um indicador que teve ocorrência.', tipo: 'error' });
      return;
    }
    if (!formData.observacao.trim()) {
      setMensagemRegistro({ texto: 'Informe o motivo ou a observação da não conformidade.', tipo: 'error' });
      return;
    }

    const valorFrete = Number(formData.frete);
    if (!Number.isFinite(valorFrete) || valorFrete < 0) {
      setMensagemRegistro({ texto: 'Informe um valor de frete válido.', tipo: 'error' });
      return;
    }

    const indicadores = [...indicadoresSelecionados];
    const desconto = formData.penalidade !== 'Não' ? valorFrete * PERCENTUAL_PENALIDADE : 0;
    const novoRegistro = {
      client_id: gerarIdCliente(),
      ...formData,
      transportadora: formData.transportadora.trim(),
      processo: formData.processo.trim(),
      frete: valorFrete,
      indicadoresOcorrencia: indicadores,
      indicadoresNaoConformes: indicadores,
      indicadoresOk: NOMES_INDICADORES.filter((indicador) => !indicadores.includes(indicador)),
      tipoOcorrencia: indicadores.join(', '),
      viagem: formData.processo.trim(),
      pontuacao: Math.max(0, 1 - pesoDosIndicadores(indicadores)),
      desconto,
      freteLiquido: valorFrete - desconto,
      criadoEm: new Date().toISOString(),
    };

    setSalvando(true);
    try {
      const resposta = await api.post('/admin/controle-sla/registros', novoRegistro);
      setRegistros((anterior) => [...anterior, normalizarRegistroDaApi(resposta.data)]);
      setFormData(FORMULARIO_INICIAL());
      setIndicadoresSelecionados([]);
      setMensagemRegistro({
        texto: 'Ocorrência registrada e salva no banco de dados central.',
        tipo: 'success',
      });
    } catch (erro) {
      console.error('Erro ao salvar ocorrência do SLA:', erro);
      setMensagemRegistro({
        texto: `Não foi possível salvar no banco: ${mensagemErroApi(erro, 'erro desconhecido')}`,
        tipo: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarTransportadora = async () => {
    const nome = novaTransportadora.trim();
    if (!apiDisponivel) {
      setMensagemTransportadora({ texto: 'O banco de dados não está conectado. Não é possível cadastrar agora.', tipo: 'error' });
      return;
    }
    if (!nome) {
      setMensagemTransportadora({ texto: 'Informe o nome da transportadora.', tipo: 'error' });
      return;
    }
    if (transportadoras.some((item) => String(item).toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) {
      setMensagemTransportadora({ texto: 'Essa transportadora já está cadastrada.', tipo: 'error' });
      return;
    }

    setSalvando(true);
    try {
      const resposta = await api.post('/admin/controle-sla/transportadoras', { nome });
      const salva = resposta.data;
      setTransportadoras((anterior) => [...anterior, salva.nome].sort((a, b) => a.localeCompare(b, 'pt-BR')));
      setTransportadoraIds((anterior) => ({ ...anterior, [salva.nome]: salva.id }));
      setNovaTransportadora('');
      setMensagemTransportadora({ texto: 'Transportadora cadastrada no banco de dados.', tipo: 'success' });
    } catch (erro) {
      setMensagemTransportadora({
        texto: `Não foi possível cadastrar a transportadora: ${mensagemErroApi(erro, 'erro desconhecido')}`,
        tipo: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverTransportadora = async (nome) => {
    if (!apiDisponivel) {
      setMensagemTransportadora({ texto: 'O banco de dados não está conectado.', tipo: 'error' });
      return;
    }
    if (registros.some((registro) => registro.transportadora === nome)) {
      setMensagemTransportadora({
        texto: 'Não remova uma transportadora que já possui histórico de viagens.',
        tipo: 'error',
      });
      return;
    }
    const id = transportadoraIds[nome];
    if (!id) {
      setMensagemTransportadora({ texto: 'Não foi possível localizar o identificador dessa transportadora no banco.', tipo: 'error' });
      return;
    }
    if (!window.confirm(`Remover ${nome} do cadastro?`)) return;

    setSalvando(true);
    try {
      await api.delete(`/admin/controle-sla/transportadoras/${id}`);
      setTransportadoras((anterior) => anterior.filter((item) => item !== nome));
      setTransportadoraIds((anterior) => {
        const proximo = { ...anterior };
        delete proximo[nome];
        return proximo;
      });
      setMensagemTransportadora({ texto: 'Transportadora removida do banco de dados.', tipo: 'success' });
    } catch (erro) {
      setMensagemTransportadora({
        texto: `Não foi possível remover: ${mensagemErroApi(erro, 'verifique se há registros vinculados')}`,
        tipo: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  const montarLinhasDetalhamento = () => {
    const cabecalho = [
      'Data', 'Modalidade', 'Transportadora', 'Processo / NF', 'Indicador afetado',
      '% total da ocorrência', 'Tipo de desvio', 'Penalidade', 'Frete bruto (R$)',
      'Desconto (R$)', 'Frete líquido (R$)', 'Observação',
    ];
    const linhas = registrosFiltrados.map((registro) => [
      registro.data || registro.dataRegistro || '',
      registro.modalidade || 'Dedicado',
      registro.transportadora || '',
      registro.processo || registro.viagem || '',
      registro.tipoOcorrencia || indicadoresDoRegistro(registro).join(', '),
      percentualTotalOcorrencia(registro),
      registro.evento || '',
      registro.penalidade || 'Não',
      Number(registro.frete || 0),
      descontoDoRegistro(registro),
      Number(registro.freteLiquido ?? (Number(registro.frete || 0) - descontoDoRegistro(registro))),
      registro.observacao || '',
    ]);
    return [cabecalho, ...linhas];
  };

  const handleExportarCSV = () => {
    if (!registrosFiltrados.length) {
      setMensagemRegistro({ texto: 'Não há registros para exportar no filtro atual.', tipo: 'error' });
      return;
    }
    baixarCSV(`comau_sla_registros_${nomeArquivoData()}.csv`, montarLinhasDetalhamento());
    setMensagemRegistro({ texto: 'Arquivo CSV gerado com os registros do filtro atual.', tipo: 'success' });
  };

  const handleExportarDetalhamento = () => {
    if (!registrosFiltrados.length) {
      window.alert('Não há registros no filtro selecionado para exportar.');
      return;
    }
    const workbook = XLSX.utils.book_new();
    adicionarAbaExcel(workbook, 'Viagens filtradas', montarLinhasDetalhamento(), [14, 14, 28, 20, 26, 20, 28, 24, 18, 18, 18, 42]);
    XLSX.writeFile(workbook, `comau_detalhamento_sla_${nomeArquivoData()}.xlsx`);
  };

  const handleExportarIndicadores = () => {
    const workbook = XLSX.utils.book_new();
    const situacao = metricas.indice >= TARGET_ACEITAVEL ? 'Dentro do target' : 'Fora do target';

    const dashboard = [
      ['COMAU | DASHBOARD DE SLA'],
      ['Controle de processos não conformes — visão exportada'],
      [resumoFiltro],
      [],
      ['Indicador gerencial', 'Resultado', 'Referência'],
      ['Processos não conformes', metricas.processosNaoConforme, 'Processos distintos com ocorrência'],
      ['Índice ponderado', percentual(metricas.indice), `Target: ${percentual(TARGET_ACEITAVEL, 0)}`],
      ['Situação do target', situacao, 'Índice igual ou superior a 90%'],
      ['Ocorrências registradas', metricas.ocorrencias, 'Somente não conformidades'],
      ['Frete bruto', metricas.frete, 'R$'],
      ['Descontos aplicados', metricas.descontos, '8% por No Show/atraso injustificado'],
    ];

    const pesos = [
      ['Indicador', 'Peso', 'Processos afetados', 'Perda ponderada', 'Impacto médio'],
      ...NOMES_INDICADORES.map((nome) => {
        const impactoMedio = metricas.processosNaoConforme
          ? metricas.impacto[nome] / metricas.processosNaoConforme
          : 0;
        return [
          nome,
          percentual(PESOS_INDICADORES[nome], 0),
          metricas.processosPorIndicador[nome],
          percentual(impactoMedio),
          percentual(impactoMedio),
        ];
      }),
    ];

    const rankingDados = [
      ['Transportadora', 'Processos não conformes', 'Índice ponderado', 'Ocorrências', 'Descontos (R$)'],
      ...ranking.map(([nome, dados]) => [
        nome,
        dados.processosNaoConforme,
        percentual(dados.indice),
        dados.ocorrencias,
        dados.descontos,
      ]),
    ];

    const descontos = [
      ['Transportadora', 'Descontos (R$)', 'Processos com ocorrência'],
      ...descontosPorTransportadora.map(([nome, dados]) => [nome, dados.descontos, dados.processosNaoConforme]),
    ];

    adicionarAbaExcel(workbook, 'Dashboard', dashboard, [30, 24, 42]);
    adicionarAbaExcel(workbook, 'Pesos indicadores', pesos, [24, 16, 22, 20, 20]);
    adicionarAbaExcel(workbook, 'Ranking', rankingDados, [30, 26, 20, 16, 18]);
    adicionarAbaExcel(workbook, 'Descontos', descontos, [30, 20, 28]);
    XLSX.writeFile(workbook, `comau_indicadores_sla_${nomeArquivoData()}.xlsx`);
  };

  const trocarAba = (aba) => {
    setActiveTab(aba);
    if (aba !== 'registro') setMensagemRegistro((anterior) => ({ ...anterior, texto: '' }));
  };

  const maxDesconto = Math.max(...descontosPorTransportadora.map(([, dados]) => dados.descontos), 0);

  return (
    <div className="controle-sla-container">
      <div className="sla-page-shell">
        <header className="sla-hero">
          <div className="sla-brand">
            <div className="sla-brand-mark" aria-hidden="true">C</div>
            <div className="sla-brand-title">
              <h1>Controle de SLA</h1>
              <p>Fretes dedicados — registro operacional e avaliação de transportadoras</p>
            </div>
          </div>
          <div className="sla-hero-note">COMAU<br />Gestão logística</div>
        </header>

        <nav className="sla-tabs" aria-label="Navegação do Controle SLA">
          <button type="button" className={`sla-tab-button ${activeTab === 'registro' ? 'active' : ''}`} onClick={() => trocarAba('registro')}>
            Registro rápido
          </button>
          <button type="button" className={`sla-tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => trocarAba('dashboard')}>
            Dashboard
          </button>
          <button type="button" className={`sla-tab-button ${activeTab === 'transportadoras' ? 'active' : ''}`} onClick={() => trocarAba('transportadoras')}>
            Transportadoras
          </button>
        </nav>

        {carregando && (
          <div className="sla-notice" role="status">Conectando ao banco de dados e carregando os registros do Controle SLA...</div>
        )}
        {!carregando && avisoApi && (
          <div className="sla-notice" role="status">
            <strong>{apiDisponivel ? 'Atenção:' : 'Banco de dados indisponível:'}</strong> {avisoApi}
          </div>
        )}

        {activeTab === 'registro' && (
          <section className="sla-tab-content">
            <div className="sla-notice">
              <strong>Preenchimento rápido:</strong> registre somente quando houver uma ocorrência não conforme. Informe a data, modalidade, transportadora, processo/NF, valor do frete e o desvio identificado.
            </div>

            <section className="sla-card">
              <h2>Registrar não conformidade</h2>
              <form onSubmit={handleRegistrar}>
                <div className="sla-basic-grid">
                  <div className="sla-field">
                    <label htmlFor="sla-modalidade">Modalidade</label>
                    <select id="sla-modalidade" value={formData.modalidade} onChange={(e) => atualizarFormulario('modalidade', e.target.value)}>
                      <option value="Dedicado">Dedicado</option>
                      <option value="Fracionado">Fracionado</option>
                    </select>
                  </div>
                  <div className="sla-field">
                    <label htmlFor="sla-data">Data da ocorrência</label>
                    <input id="sla-data" type="date" value={formData.data} onChange={(e) => atualizarFormulario('data', e.target.value)} required />
                  </div>
                  <div className="sla-field">
                    <label htmlFor="sla-transportadora">Transportadora</label>
                    <select id="sla-transportadora" value={formData.transportadora} onChange={(e) => atualizarFormulario('transportadora', e.target.value)} required={transportadoras.length > 0}>
                      <option value="">Selecione uma transportadora</option>
                      {transportadoras.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                    </select>
                  </div>
                  <div className="sla-field">
                    <label htmlFor="sla-processo">Processo / NF / Viagem</label>
                    <input id="sla-processo" type="text" placeholder="Ex.: NF12345" value={formData.processo} onChange={(e) => atualizarFormulario('processo', e.target.value)} required />
                  </div>
                  <div className="sla-field">
                    <label htmlFor="sla-frete">Valor do frete (R$)</label>
                    <input id="sla-frete" type="number" min="0" step="0.01" placeholder="0,00" value={formData.frete} onChange={(e) => atualizarFormulario('frete', e.target.value)} required />
                  </div>
                </div>

                {formData.modalidade === 'Fracionado' && (
                  <div className="sla-fraction-info">
                    <strong>Fracionado:</strong> a coleta e a entrega devem ocorrer em até 7 dias úteis contados da solicitação. Sábados e domingos não entram na contagem. Registre somente quando houver uma ocorrência não conforme.
                  </div>
                )}

                <div className="sla-section-title">
                  <h3>Marque somente os indicadores que tiveram ocorrência</h3>
                  <span> cada seleção desconta o peso do resultado.</span>
                </div>
                <div className="sla-indicator-grid">
                  {NOMES_INDICADORES.map((indicador) => (
                    <label key={indicador} className={`sla-indicator-card ${indicadoresSelecionados.includes(indicador) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={indicadoresSelecionados.includes(indicador)}
                        onChange={() => alternarIndicador(indicador)}
                      />
                      <span>
                        <strong>{indicador}</strong>
                        <small>-{(PESOS_INDICADORES[indicador] * 100).toFixed(0)}%</small>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="sla-score-preview" aria-live="polite">
                  <span>Índice calculado</span>
                  <strong>{percentual(pontuacaoSelecionada, 0)} de 100%</strong>
                  <span className={`sla-target-status ${dentroDoTarget ? 'ok' : 'fora'}`}>
                    {dentroDoTarget ? 'Dentro do target' : 'Abaixo do target'}
                  </span>
                </div>

                <div className="sla-section-title compact">
                  <h3>Detalhes da ocorrência</h3>
                  <span>Informe o motivo para concluir o registro.</span>
                </div>
                <div className="sla-occurrence-grid">
                  <div className="sla-field">
                    <label htmlFor="sla-evento">Tipo de desvio</label>
                    <input id="sla-evento" type="text" placeholder="Ex.: No Show, avaria, falta, atraso" value={formData.evento} onChange={(e) => atualizarFormulario('evento', e.target.value)} />
                  </div>
                  <div className="sla-field">
                    <label htmlFor="sla-penalidade">Penalidade</label>
                    <select id="sla-penalidade" value={formData.penalidade} onChange={(e) => atualizarFormulario('penalidade', e.target.value)}>
                      <option value="Não">Não aplicar</option>
                      <option value="No Show">No Show — 8%</option>
                      <option value="Atraso injustificado">Atraso injustificado — 8%</option>
                    </select>
                  </div>
                </div>
                <div className="sla-field sla-observation-field">
                  <label htmlFor="sla-observacao">Motivo / observação</label>
                  <input id="sla-observacao" type="text" placeholder="Informe brevemente a causa do desvio" value={formData.observacao} onChange={(e) => atualizarFormulario('observacao', e.target.value)} required />
                </div>

                <div className="sla-actions">
                  <button type="button" className="sla-btn sla-btn-secondary" onClick={() => trocarAba('transportadoras')}>
                    Cadastrar transportadora
                  </button>
                  <div className="sla-actions-right">
                    <button type="button" className="sla-btn sla-btn-secondary" onClick={handleExportarCSV}>Exportar CSV</button>
                    <button type="submit" className="sla-btn sla-btn-primary" disabled={salvando || carregando || !apiDisponivel}>{salvando ? 'Salvando...' : 'Registrar ocorrência'}</button>
                  </div>
                </div>
                {mensagemRegistro.texto && (
                  <div className={`sla-message ${mensagemRegistro.tipo}`} role="status">{mensagemRegistro.texto}</div>
                )}
              </form>
            </section>

            <section className="sla-card">
              <h2>Regra resumida do protocolo</h2>
              <div className="sla-rules">
                <div className="sla-rule"><strong>Dedicado</strong>Coleta em até 6 horas ou conforme agendamento. Entrega comparada com o Lead Time da rota.</div>
                <div className="sla-rule"><strong>Fracionado</strong>Coleta e entrega em até 7 dias úteis contados da data da solicitação. Sábados e domingos não entram na contagem.</div>
                <div className="sla-rule"><strong>Resposta</strong>Resposta operacional ou comercial em até 2 horas.</div>
                <div className="sla-rule"><strong>Veículo e ocorrência</strong>Registrar veículo recusado/não apresentado e qualquer avaria, falta, atraso ou outro desvio.</div>
                <div className="sla-rule"><strong>Penalidade</strong>No Show na coleta ou atraso injustificado aplica desconto automático de 8% sobre o frete da viagem.</div>
              </div>
              <p className="sla-footer-note">
                O sistema registra somente processos não conformes. Cada ocorrência recebe o peso do indicador afetado e pode gerar penalidade de 8% quando for No Show ou atraso injustificado.
              </p>
            </section>
          </section>
        )}

        {activeTab === 'dashboard' && (
          <section className="sla-tab-content">
            <section className="sla-card">
              <h2>Dashboard gerencial</h2>
              <div className="sla-filter-grid">
                <div className="sla-field">
                  <label htmlFor="sla-tipo-periodo">Período</label>
                  <select id="sla-tipo-periodo" value={filtros.periodo} onChange={(e) => atualizarFiltro('periodo', e.target.value)}>
                    <option value="todos">Todos os registros</option>
                    <option value="semana">Semana</option>
                    <option value="mes">Mês</option>
                    <option value="ano">Ano</option>
                  </select>
                </div>
                <div className="sla-field">
                  <label htmlFor="sla-data-referencia">Data de referência</label>
                  <input id="sla-data-referencia" type="date" value={filtros.dataReferencia} onChange={(e) => atualizarFiltro('dataReferencia', e.target.value)} disabled={filtros.periodo === 'todos'} />
                </div>
                <div className="sla-field">
                  <label htmlFor="sla-filtro-transportadora">Transportadora</label>
                  <select id="sla-filtro-transportadora" value={filtros.transportadora} onChange={(e) => atualizarFiltro('transportadora', e.target.value)}>
                    <option value="Todas">Todas as transportadoras</option>
                    {transportadoras.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                  </select>
                </div>
                <div className="sla-field">
                  <label htmlFor="sla-filtro-modalidade">Modalidade</label>
                  <select id="sla-filtro-modalidade" value={filtros.modalidade} onChange={(e) => atualizarFiltro('modalidade', e.target.value)}>
                    <option value="Todas">Todas</option>
                    <option value="Dedicado">Dedicado</option>
                    <option value="Fracionado">Fracionado</option>
                  </select>
                </div>
                <button type="button" className="sla-btn sla-btn-primary sla-filter-reset" onClick={() => setFiltros({ periodo: 'todos', dataReferencia: dataHojeLocal(), transportadora: 'Todas', modalidade: 'Todas' })}>
                  Limpar filtros
                </button>
              </div>
              <div className="sla-filter-summary">{resumoFiltro}</div>
            </section>

            <section className="sla-dashboard-kpis">
              <div className="sla-kpi"><small>Processos não conformes</small><strong>{metricas.processosNaoConforme}</strong></div>
              <div className="sla-kpi"><small>Índice ponderado</small><strong>{percentual(metricas.indice)}</strong></div>
              <div className="sla-kpi"><small>Target aceitável</small><strong>{percentual(TARGET_ACEITAVEL)}</strong></div>
              <div className="sla-kpi"><small>Ocorrências registradas</small><strong>{metricas.ocorrencias}</strong></div>
              <div className="sla-kpi"><small>Frete bruto</small><strong>{moeda(metricas.frete)}</strong></div>
              <div className="sla-kpi"><small>Descontos</small><strong>{moeda(metricas.descontos)}</strong></div>
            </section>

            <div className="sla-dashboard-grid">
              <section className="sla-card">
                <h3>Índice ponderado x target</h3>
                <div className="sla-target-chart">
                  <div className="sla-target-result">
                    <strong>{percentual(metricas.indice)}</strong>
                    <span className={`sla-target-status ${metricas.indice >= TARGET_ACEITAVEL ? 'ok' : 'fora'}`}>
                      {metricas.indice >= TARGET_ACEITAVEL ? 'Dentro do target' : 'Fora do target'}
                    </span>
                  </div>
                  <div className="sla-target-scale"><span>0%</span><span>50%</span><span>90%</span><span>100%</span></div>
                  <div className="sla-target-track">
                    <div className="sla-target-fill" style={{ width: `${Math.min(100, metricas.indice * 100)}%` }} />
                    <div className="sla-target-line"><span>Target 90%</span></div>
                  </div>
                  <div className="sla-target-caption"><span>Resultado ponderado</span><strong>Meta mínima: 90%</strong></div>
                </div>
                <p className="sla-muted">O resultado é considerado dentro da meta quando o índice ponderado for igual ou superior a 90%.</p>
              </section>

              <section className="sla-card">
                <h3>Impacto por indicador</h3>
                {NOMES_INDICADORES.map((nome) => {
                  const quantidade = metricas.processosPorIndicador[nome] || 0;
                  const impactoVisual = metricas.processosNaoConforme
                    ? Math.min(100, ((metricas.impacto[nome] || 0) / metricas.processosNaoConforme) * 100)
                    : 0;
                  return (
                    <div className="sla-bar-row" key={nome}>
                      <span>{nome} ({(PESOS_INDICADORES[nome] * 100).toFixed(0)}%)</span>
                      <div className="sla-bar-track"><div className="sla-bar-fill" style={{ width: `${impactoVisual}%` }} /></div>
                      <span className="sla-bar-value">{quantidade}</span>
                    </div>
                  );
                })}
                <p className="sla-muted">Cada ocorrência reduz o índice de acordo com o peso do indicador afetado.</p>
              </section>
            </div>

            <section className="sla-card">
              <h3>Descontos por transportadora</h3>
              {descontosPorTransportadora.length ? (
                descontosPorTransportadora.slice(0, 8).map(([nome, dados]) => (
                  <div className="sla-bar-row sla-discount-row" key={nome}>
                    <span title={nome}>{nome}</span>
                    <div className="sla-bar-track"><div className="sla-bar-fill" style={{ width: `${maxDesconto ? (dados.descontos / maxDesconto) * 100 : 0}%` }} /></div>
                    <span className="sla-bar-value">{moeda(dados.descontos)}</span>
                  </div>
                ))
              ) : (
                <p className="sla-empty">Não há descontos no filtro selecionado.</p>
              )}
              <p className="sla-muted">Valor acumulado das penalidades de 8% no período filtrado.</p>
            </section>

            <section className="sla-card">
              <div className="sla-section-heading">
                <div>
                  <h3>Indicadores do dashboard</h3>
                  <p className="sla-muted">O arquivo inclui o índice ponderado, os pesos dos indicadores, o target de 90%, o ranking por transportadora e o filtro aplicado.</p>
                </div>
                <button type="button" className="sla-btn sla-btn-primary" onClick={handleExportarIndicadores}>Exportar indicadores para Excel</button>
              </div>
              <h3 className="sla-subheading">Ranking de transportadoras</h3>
              <div className="sla-table-wrap">
                <table className="sla-table">
                  <thead><tr><th>Transportadora</th><th>Processos não conformes</th><th>Índice ponderado</th><th>Ocorrências</th><th>Descontos</th></tr></thead>
                  <tbody>
                    {ranking.length ? ranking.map(([nome, dados]) => (
                      <tr key={nome}>
                        <td>{nome}</td><td>{dados.processosNaoConforme}</td><td>{percentual(dados.indice)}</td><td>{dados.ocorrencias}</td><td>{moeda(dados.descontos)}</td>
                      </tr>
                    )) : <tr><td colSpan="5" className="sla-empty-cell">Nenhum registro no filtro selecionado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="sla-card">
              <div className="sla-section-heading">
                <div><h3>Detalhamento dos processos não conformes</h3></div>
                <button type="button" className="sla-btn sla-btn-primary" onClick={handleExportarDetalhamento}>Exportar detalhamento para Excel</button>
              </div>
              <div className="sla-table-wrap">
                <table className="sla-table sla-detail-table">
                  <thead>
                    <tr>
                      <th>Data</th><th>Modalidade</th><th>Transportadora</th><th>Processo / NF</th>
                      <th>Indicador afetado</th><th>% total da ocorrência</th><th>Tipo de desvio</th>
                      <th>Penalidade</th><th>Frete</th><th>Desconto</th><th>Líquido</th><th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosDaPagina.length ? registrosDaPagina.map((registro, index) => (
                      <tr key={`${idDoProcesso(registro)}-${registro.criadoEm || registro.dataRegistro || index}-${index}`}>
                        <td>{dataBR(registro.data || registro.dataRegistro)}</td>
                        <td>{registro.modalidade || 'Dedicado'}</td>
                        <td>{registro.transportadora || '-'}</td>
                        <td>{registro.processo || registro.viagem || '-'}</td>
                        <td>{registro.tipoOcorrencia || indicadoresDoRegistro(registro).join(', ') || '-'}</td>
                        <td>{percentualTotalOcorrencia(registro)}</td>
                        <td>{registro.evento || '-'}</td>
                        <td>{registro.penalidade || 'Não'}</td>
                        <td>{moeda(registro.frete)}</td>
                        <td>{moeda(descontoDoRegistro(registro))}</td>
                        <td>{moeda(registro.freteLiquido ?? (Number(registro.frete || 0) - descontoDoRegistro(registro)))}</td>
                        <td>{registro.observacao || '-'}</td>
                      </tr>
                    )) : <tr><td colSpan="12" className="sla-empty-cell">Nenhum registro no filtro selecionado.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="sla-pagination">
                <span>
                  {registrosFiltrados.length
                    ? `Mostrando ${inicioPagina + 1} até ${Math.min(inicioPagina + LINHAS_POR_PAGINA, registrosFiltrados.length)} de ${registrosFiltrados.length} registros`
                    : 'Mostrando 0 até 0 de 0 registros'}
                </span>
                <div className="sla-pagination-controls">
                  <button type="button" className="sla-btn sla-btn-secondary" onClick={() => setPaginaDetalhamento((atual) => Math.max(1, atual - 1))} disabled={paginaAtual <= 1}>‹ Anterior</button>
                  <strong>{paginaAtual} / {totalPaginas}</strong>
                  <button type="button" className="sla-btn sla-btn-secondary" onClick={() => setPaginaDetalhamento((atual) => Math.min(totalPaginas, atual + 1))} disabled={paginaAtual >= totalPaginas}>Próxima ›</button>
                </div>
              </div>
            </section>
          </section>
        )}

        {activeTab === 'transportadoras' && (
          <section className="sla-tab-content">
            <section className="sla-card">
              <h2>Cadastro de transportadoras</h2>
              <p className="sla-muted sla-intro-text">
                Cadastre cada transportadora uma única vez. Depois, ela aparecerá na lista de seleção do registro da viagem, evitando erros de digitação.
              </p>
              <div className="sla-add-company">
                <div className="sla-field">
                  <label htmlFor="sla-nova-transportadora">Nome da transportadora</label>
                  <input
                    id="sla-nova-transportadora"
                    type="text"
                    placeholder="Ex.: Transportadora Alfa Ltda."
                    value={novaTransportadora}
                    onChange={(e) => setNovaTransportadora(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdicionarTransportadora(); } }}
                  />
                </div>
                <button type="button" className="sla-btn sla-btn-primary" onClick={handleAdicionarTransportadora} disabled={salvando || carregando || !apiDisponivel}>{salvando ? 'Salvando...' : 'Adicionar'}</button>
              </div>
              {mensagemTransportadora.texto && (
                <div className={`sla-message ${mensagemTransportadora.tipo}`} role="status">{mensagemTransportadora.texto}</div>
              )}
            </section>

            <section className="sla-card">
              <div className="sla-section-heading">
                <div>
                  <h3>Transportadoras cadastradas</h3>
                  <p className="sla-muted">{transportadoras.length} transportadora(s) cadastrada(s).</p>
                </div>
              </div>
              <ul className="sla-company-list">
                {transportadoras.length ? transportadoras.map((nome) => (
                  <li key={nome}>
                    <span>{nome}</span>
                    <button type="button" className="sla-btn sla-btn-danger" onClick={() => handleRemoverTransportadora(nome)} disabled={salvando || !apiDisponivel}>Remover</button>
                  </li>
                )) : <li className="sla-empty">Nenhuma transportadora cadastrada.</li>}
              </ul>
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
