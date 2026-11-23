const { pb, withAuth } = require('../config/pocketbase');

const COLECAO_REGISTROS = 'controle_sla_registros';
const COLECAO_TRANSPORTADORAS = 'controle_sla_transportadoras';
const PESOS = Object.freeze({
  Coleta: 0.25,
  Entrega: 0.25,
  Resposta: 0.10,
  Frota: 0.15,
  'Ocorrência': 0.25,
});
const PENALIDADE = 0.08;

function normalizarNome(nome) {
  return String(nome || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function obterIndicadores(dados) {
  let lista = dados.indicadoresOcorrencia ?? dados.indicadores_ocorrencia ??
    dados.indicadoresNaoConformes ?? dados.indicadores_nao_conformes;

  if (!Array.isArray(lista) && dados.tipoOcorrencia) {
    lista = String(dados.tipoOcorrencia).split(',').map((item) => item.trim());
  }

  if (!Array.isArray(lista) && dados.tipo_ocorrencia) {
    lista = String(dados.tipo_ocorrencia).split(',').map((item) => item.trim());
  }

  return [...new Set((Array.isArray(lista) ? lista : []).filter((item) => Object.hasOwn(PESOS, item)))];
}

function prepararRegistro(dados = {}) {
  const indicadores = obterIndicadores(dados);
  const modalidade = String(dados.modalidade || 'Dedicado').trim();
  const data = String(dados.data || dados.dataRegistro || dados.data_registro || '').slice(0, 10);
  const transportadora = String(dados.transportadora || '').trim();
  const processo = String(dados.processo || dados.viagem || '').trim();
  const frete = Number(dados.frete || 0);
  const penalidade = String(dados.penalidade || 'Não');
  const desconto = penalidade !== 'Não' ? Number((frete * PENALIDADE).toFixed(2)) : 0;
  const peso = indicadores.reduce((total, item) => total + PESOS[item], 0);
  const indicadoresOk = Object.keys(PESOS).filter((item) => !indicadores.includes(item));

  if (!data) throw Object.assign(new Error('Informe a data da ocorrência.'), { statusCode: 400 });
  if (!transportadora) throw Object.assign(new Error('Informe a transportadora.'), { statusCode: 400 });
  if (!processo) throw Object.assign(new Error('Informe o processo, NF ou número da viagem.'), { statusCode: 400 });
  if (!Number.isFinite(frete) || frete < 0) throw Object.assign(new Error('Valor do frete inválido.'), { statusCode: 400 });
  if (!indicadores.length) throw Object.assign(new Error('Selecione ao menos um indicador com ocorrência.'), { statusCode: 400 });
  if (!String(dados.observacao || '').trim()) throw Object.assign(new Error('Informe o motivo ou a observação da não conformidade.'), { statusCode: 400 });
  if (!['Dedicado', 'Fracionado'].includes(modalidade)) throw Object.assign(new Error('Modalidade inválida.'), { statusCode: 400 });
  if (!['Não', 'No Show', 'Atraso injustificado'].includes(penalidade)) throw Object.assign(new Error('Penalidade inválida.'), { statusCode: 400 });

  return {
    client_id: String(dados.client_id || dados.clientId || '').trim(),
    modalidade,
    data,
    transportadora,
    processo,
    frete,
    evento: String(dados.evento || '').trim(),
    penalidade,
    observacao: String(dados.observacao || '').trim(),
    indicadores_ocorrencia: indicadores,
    indicadores_nao_conformes: indicadores,
    indicadores_ok: indicadoresOk,
    tipo_ocorrencia: indicadores.join(', '),
    viagem: processo,
    pontuacao: Math.max(0, 1 - peso),
    desconto,
    frete_liquido: Number((frete - desconto).toFixed(2)),
    criado_em: String(dados.criadoEm || dados.criado_em || new Date().toISOString()),
  };
}

function paraCliente(registro) {
  return {
    id: registro.id,
    client_id: registro.client_id || '',
    modalidade: registro.modalidade || 'Dedicado',
    data: registro.data || '',
    transportadora: registro.transportadora || '',
    processo: registro.processo || registro.viagem || '',
    viagem: registro.viagem || registro.processo || '',
    frete: Number(registro.frete || 0),
    evento: registro.evento || '',
    penalidade: registro.penalidade || 'Não',
    observacao: registro.observacao || '',
    indicadoresOcorrencia: Array.isArray(registro.indicadores_ocorrencia) ? registro.indicadores_ocorrencia : [],
    indicadoresNaoConformes: Array.isArray(registro.indicadores_nao_conformes) ? registro.indicadores_nao_conformes : [],
    indicadoresOk: Array.isArray(registro.indicadores_ok) ? registro.indicadores_ok : [],
    tipoOcorrencia: registro.tipo_ocorrencia || '',
    pontuacao: Number(registro.pontuacao ?? 1),
    desconto: Number(registro.desconto || 0),
    freteLiquido: Number(registro.frete_liquido ?? registro.frete ?? 0),
    criadoEm: registro.criado_em || registro.created || '',
    created: registro.created || '',
  };
}

async function encontrarPorClientId(clientId) {
  if (!clientId) return null;
  try {
    return await withAuth(() => pb.collection(COLECAO_REGISTROS).getFirstListItem(
      pb.filter('client_id = {:clientId}', { clientId })
    ));
  } catch (erro) {
    if (erro?.status === 404 || erro?.statusCode === 404) return null;
    throw erro;
  }
}

async function salvarRegistro(dados) {
  const preparado = prepararRegistro(dados);
  if (preparado.client_id) {
    const existente = await encontrarPorClientId(preparado.client_id);
    if (existente) return { registro: existente, duplicado: true };
  }
  const registro = await withAuth(() => pb.collection(COLECAO_REGISTROS).create(preparado));
  return { registro, duplicado: false };
}

const listarRegistros = async (req, res) => {
  try {
    const dados = await withAuth(() => pb.collection(COLECAO_REGISTROS).getFullList({ sort: '-data,-created' }));
    res.json(dados.map(paraCliente));
  } catch (erro) {
    console.error('[Controle SLA] Erro ao listar registros:', erro);
    res.status(500).json({ erro: erro.message || 'Não foi possível consultar os registros do SLA.' });
  }
};

const criarRegistro = async (req, res) => {
  try {
    const { registro, duplicado } = await salvarRegistro(req.body);
    res.status(duplicado ? 200 : 201).json(paraCliente(registro));
  } catch (erro) {
    console.error('[Controle SLA] Erro ao criar registro:', erro);
    res.status(erro.statusCode || 400).json({ erro: erro.message || 'Não foi possível salvar o registro.' });
  }
};

// Migração idempotente do LocalStorage antigo para o banco central.
// client_id + índice único evitam duplicar itens quando a conexão cai no meio da importação.
const importarRegistrosLocais = async (req, res) => {
  const lista = req.body?.registros;
  if (!Array.isArray(lista)) return res.status(400).json({ erro: 'Envie uma lista de registros para importar.' });
  if (lista.length > 1000) return res.status(400).json({ erro: 'A importação está limitada a 1.000 registros por chamada.' });

  let importados = 0;
  let duplicados = 0;
  const erros = [];

  for (let indice = 0; indice < lista.length; indice += 1) {
    try {
      const item = { ...lista[indice] };
      if (!item.client_id && !item.clientId) {
        item.client_id = `legacy-${Date.now()}-${indice}-${normalizarNome(item.processo || item.viagem || 'sla')}`;
      }
      const resultado = await salvarRegistro(item);
      if (resultado.duplicado) duplicados += 1;
      else importados += 1;
    } catch (erro) {
      erros.push({ indice, erro: erro.message || 'Erro desconhecido' });
    }
  }

  if (erros.length) {
    return res.status(400).json({
      erro: `A importação foi parcial: ${importados} incluído(s), ${duplicados} já existente(s), ${erros.length} com erro. A operação pode ser repetida com segurança.`,
      importados,
      duplicados,
      erros: erros.slice(0, 20),
    });
  }

  return res.json({ importados, duplicados, total: lista.length });
};

const excluirRegistro = async (req, res) => {
  try {
    await withAuth(() => pb.collection(COLECAO_REGISTROS).delete(req.params.id));
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message || 'Não foi possível excluir o registro.' });
  }
};

const listarTransportadoras = async (req, res) => {
  try {
    const dados = await withAuth(() => pb.collection(COLECAO_TRANSPORTADORAS).getFullList({ sort: '+nome' }));
    res.json(dados.map(({ id, nome, created }) => ({ id, nome, created })));
  } catch (erro) {
    console.error('[Controle SLA] Erro ao listar transportadoras:', erro);
    res.status(500).json({ erro: erro.message || 'Não foi possível consultar as transportadoras do SLA.' });
  }
};

const criarTransportadora = async (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  const nomeNormalizado = normalizarNome(nome);
  if (!nome) return res.status(400).json({ erro: 'Informe o nome da transportadora.' });

  try {
    let existente = null;
    try {
      existente = await withAuth(() => pb.collection(COLECAO_TRANSPORTADORAS).getFirstListItem(
        pb.filter('nome_normalizado = {:nome}', { nome: nomeNormalizado })
      ));
    } catch (erroBusca) {
      if (erroBusca?.status !== 404 && erroBusca?.statusCode !== 404) throw erroBusca;
    }

    if (existente) return res.status(200).json({ id: existente.id, nome: existente.nome, existente: true });
    const criada = await withAuth(() => pb.collection(COLECAO_TRANSPORTADORAS).create({ nome, nome_normalizado: nomeNormalizado }));
    return res.status(201).json({ id: criada.id, nome: criada.nome, existente: false });
  } catch (erro) {
    console.error('[Controle SLA] Erro ao criar transportadora:', erro);
    res.status(400).json({ erro: erro.message || 'Não foi possível cadastrar a transportadora.' });
  }
};

const excluirTransportadora = async (req, res) => {
  try {
    const transportadora = await withAuth(() => pb.collection(COLECAO_TRANSPORTADORAS).getOne(req.params.id));
    const vinculados = await withAuth(() => pb.collection(COLECAO_REGISTROS).getFullList({
      filter: pb.filter('transportadora = {:nome}', { nome: transportadora.nome }),
      fields: 'id',
    }));

    if (vinculados.length) {
      return res.status(409).json({ erro: 'Esta transportadora possui registros de SLA vinculados e não pode ser removida.' });
    }

    await withAuth(() => pb.collection(COLECAO_TRANSPORTADORAS).delete(req.params.id));
    return res.status(204).send();
  } catch (erro) {
    console.error('[Controle SLA] Erro ao excluir transportadora:', erro);
    return res.status(500).json({ erro: erro.message || 'Não foi possível remover a transportadora.' });
  }
};

module.exports = {
  listarRegistros,
  criarRegistro,
  importarRegistrosLocais,
  excluirRegistro,
  listarTransportadoras,
  criarTransportadora,
  excluirTransportadora,
};
