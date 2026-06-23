// src/controllers/transporteController.js
const { pb, withAuth } = require('../config/pocketbase');
const { formatarProBanco } = require('../utils/formatters');

const enderecosComau = {
  "COMAU BETIM - GALPÃO 57 BR01": {
    nome_local: "COMAU BETIM, GALPÃO 57 BR01",
    logradouro: "Av. do Contorno",
    numero: "3455",
    bairro: "Paulo Camilo",
    municipio: "Betim",
    uf: "MG",
    cep: "32669-185"
  },
  "COMAU BETIM - TIJOLINHO BR06": {
    nome_local: "COMAU BETIM, TIJOLINHO BR06",
    logradouro: "Av. do Contorno",
    numero: "3455",
    bairro: "Paulo Camilo",
    municipio: "Betim",
    uf: "MG",
    cep: "32669-185"
  },
  "COMAU GOIANA - PE": {
    nome_local: "COMAU GOIANA",
    logradouro: "Rodovia PE-075, km 114, Parte A",
    numero: null,
    bairro: null,
    municipio: "Goiana",
    uf: "PE",
    cep: "55900-000"
  },
  "COMAU SANTO ANDRÉ - SP": {
    nome_local: "COMAU SANTO ANDRÉ",
    logradouro: "Avenida Alexandre de Gusmão",
    numero: "1395",
    bairro: "Vila Homero Thon",
    municipio: "Santo André",
    uf: "SP",
    cep: "09111-310"
  }
};

const num = (val) => (val === "" || val === undefined || val === null ? null : parseFloat(val));
const str = (val) => (val === "" || val === undefined || val === null ? "" : String(val));

async function gerarProximoNumeroATM() {
  try {
    const records = await withAuth(() =>
      pb.collection('pedidos_atm').getList(1, 1, {
        sort: '-numero_atm',
        fields: 'numero_atm'
      })
    );

    if (records.items.length > 0 && records.items[0].numero_atm) {
      const ultimoNumero = parseInt(records.items[0].numero_atm, 10);
      if (!isNaN(ultimoNumero)) {
        // 🟢 Se o próximo número calculado for menor que 18635, dá o salto automático.
        const proximo = ultimoNumero + 1;
        return proximo < 18640 ? '18640' : String(proximo);
      }
    }
    // 🟢 Se o banco estiver vazio, começa no 18635
    return '18640';
  } catch (error) {
    console.error('Erro ao buscar a sequencia do ATM:', error);
    // 🟢 Proteção contra falhas: começa no 18635
    return '18640';
  }
}

function isConflitoNumeroAtm(e) {
  try {
    const data = (e && e.response && e.response.data) || (e && e.data) || {};
    if (data.numero_atm) return true;
    const txt = JSON.stringify((e && e.response) || (e && e.message) || '');
    return /not_unique|unique|numero_atm/i.test(txt);
  } catch (_) {
    return false;
  }
}

async function criarPedidoComNumeroAtm(dadosPedido) {
  for (let tentativa = 0; tentativa < 15; tentativa++) {
    const numero_atm = await gerarProximoNumeroATM();
    try {
      return await withAuth(() => pb.collection('pedidos_atm').create({ ...dadosPedido, numero_atm }));
    } catch (e) {
      if (isConflitoNumeroAtm(e) && tentativa < 14) continue; 
      throw e;
    }
  }
  throw new Error('Nao foi possivel gerar um numero de ATM unico apos varias tentativas.');
}

const criarTransporte = async (req, res) => {
  const dados = req.body;

  try {
    const localColeta = await withAuth(() => pb.collection('enderecos_pedido').create({
      nome_local: str(dados.empresaColeta),
      municipio: str(dados.cidadeColeta),
      uf: str(dados.ufColeta),
      cep: str(dados.cepColeta),
      logradouro: str(dados.logradouroColeta),
      numero: str(dados.numeroColeta),
      bairro: str(dados.bairroColeta)
    }));

    const localEntrega = await withAuth(() => pb.collection('enderecos_pedido').create({
      nome_local: str(dados.empresaEntrega) || 'Destinatário',
      municipio: str(dados.cidadeEntrega),
      uf: str(dados.ufEntrega),
      cep: str(dados.cepEntrega),
      logradouro: str(dados.logradouroEntrega),
      numero: str(dados.numeroEntrega),
      bairro: str(dados.bairroEntrega)
    }));

    const pedidoAtm = await criarPedidoComNumeroAtm({
      data_solicitacao: dados.dataSolicitacao ? formatarProBanco(dados.dataSolicitacao) : null,
      tipo_operacao: str(dados.tipo_operacao),
      pedido_compra: str(dados.pedidoCompra),
      nf: str(dados.nf),
      valor_nf: num(dados.valor_nf),
      wbs: str(dados.wbs),
      contato_coleta: str(dados.nomeContatoColeta),
      telefone_coleta: str(dados.telefoneColeta),
      contato_entrega: str(dados.nomeContatoEntrega),
      telefone_entrega: str(dados.telefoneEntrega),
      numero_reserva: str(dados.numeroReserva),
      id_origem: localColeta.id,
      id_destino: localEntrega.id,
      tipo_frete: str(dados.frete),
      solicitacao: str(dados.solicitante),
      veiculo: str(dados.veiculo),
      lista_cargas: dados.listaCargas ? JSON.parse(dados.listaCargas) : null,
      quantidade_volumes: parseInt(dados.quantidadeVolumes) || 0,
      peso: num(dados.pesoTotal) || 0,
      volume: 0,
      
      data_coleta: dados.dataColeta ? formatarProBanco(dados.dataColeta) : null,
      hora_coleta: str(dados.horaColeta),
      
      data_entrega: dados.dataEntrega ? formatarProBanco(dados.dataEntrega) : null,
      hora_entrega: str(dados.horaEntrega),
      
      status: 'Aguardando Aprovação',
      observacoes: str(dados.obs)
    });

    req.app.get('io').emit('transportes_atualizados');
    res.status(201).json({ mensagem: 'Sucesso!', id_gerado: pedidoAtm.id, numero_atm: pedidoAtm.numero_atm });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const receberWebhookGoogleForms = async (req, res) => {
  try {
    const dados = req.body;
    const dataSolLimpa = dados.dataSolicitacao ? dados.dataSolicitacao.split(' ')[0] : null;

    const endColeta = enderecosComau[dados.empresaColeta] || {
        nome_local: dados.empresaColeta || 'Coleta Não Especificada',
        municipio: dados.cidadeColeta || null,
        uf: dados.ufColeta || null,
        cep: dados.cepColeta || null,
        logradouro: dados.logradouroColeta || null,
        numero: dados.numeroColeta || null,
        bairro: dados.bairroColeta || null
    };

    const localColeta = await withAuth(() => pb.collection('enderecos_pedido').create(endColeta));

    const endEntrega = enderecosComau[dados.empresaEntrega] || {
        nome_local: dados.empresaEntrega || 'Destinatário Filial',
        municipio: dados.cidadeEntrega || null,
        uf: dados.ufEntrega || null,
        cep: dados.cepEntrega || null,
        logradouro: dados.logradouroEntrega || null,
        numero: dados.numeroEntrega || null,
        bairro: dados.bairroEntrega || null
    };

    const localEntrega = await withAuth(() => pb.collection('enderecos_pedido').create(endEntrega));

    const cargaGenerica = [{
      id: Date.now(),
      nome: "Carga via Google Forms",
      quantidade: parseInt(dados.quantidadeVolumes) || 1,
      peso: parseFloat(dados.pesoTotal) || 0,
      comprimento: '', largura: '', altura: '', cor: '#64748b',
      detalhes_adicionais: dados.obs || ''
    }];

    const pedidoAtm = await criarPedidoComNumeroAtm({
      tipo_operacao: 'Nacional',
      data_solicitacao: dataSolLimpa ? formatarProBanco(dataSolLimpa) : null,
      pedido_compra: str(dados.pedidoCompra),
      nf: str(dados.nf),
      wbs: str(dados.wbs),
      contato_coleta: str(dados.nomeContatoColeta),
      telefone_coleta: str(dados.telefoneColeta),
      contato_entrega: str(dados.nomeContatoEntrega),
      telefone_entrega: str(dados.telefoneEntrega),
      id_origem: localColeta.id,
      id_destino: localEntrega.id,
      tipo_frete: str(dados.frete),
      solicitacao: str(dados.solicitante),
      veiculo: str(dados.veiculo),
      lista_cargas: cargaGenerica,
      quantidade_volumes: parseInt(dados.quantidadeVolumes) || 1,
      peso: num(dados.pesoTotal) || 0,
      volume: 0,
      data_coleta: dados.dataColeta ? formatarProBanco(dados.dataColeta) : null,
      hora_coleta: "",
      data_entrega: dados.dataEntrega ? formatarProBanco(dados.dataEntrega) : null,
      hora_entrega: "",
      status: 'Pendente',
      observacoes: str(dados.obs)
    });

    req.app.get('io').emit('transportes_atualizados');
    res.status(200).send("Webhook processado e salvo com sucesso!");
  } catch (erro) {
    console.error("❌ Erro no Webhook:", erro.message);
    res.status(500).send("Erro interno ao processar dados do formulário.");
  }
};

const listarTransportesAdmin = async (req, res) => {
  try {
    const registros = await withAuth(() => pb.collection('pedidos_atm').getFullList({
      sort: '-created_at',
      expand: 'id_origem,id_destino,id_transportadora'
    }));

    const faturamentos = await withAuth(() => pb.collection('faturamento_atm').getFullList());
    const fatMap = {};
    faturamentos.forEach(f => fatMap[f.id_atm] = f);

    const dadosFormatados = registros.map(item => {
      const { expand, ...resto } = item;
      return {
        ...resto,
        origem: expand?.id_origem || null,
        destino: expand?.id_destino || null,
        transportadora: expand?.id_transportadora || null,
        faturamento: fatMap[item.id] || null
      };
    });

    res.json(dadosFormatados);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const atualizarTransporteAdmin = async (req, res) => {
  const { id } = req.params;
  const d = req.body;

  try {
    const updateAtm = {};
    if (d.status !== undefined) updateAtm.status = str(d.status);
    if (d.tipo_operacao !== undefined) updateAtm.tipo_operacao = str(d.tipo_operacao);
    if (d.solicitacao !== undefined) updateAtm.solicitacao = str(d.solicitacao);
    if (d.data_solicitacao !== undefined) updateAtm.data_solicitacao = d.data_solicitacao ? formatarProBanco(d.data_solicitacao) : null;
    if (d.pedido_compra !== undefined) updateAtm.pedido_compra = str(d.pedido_compra);
    if (d.numero_reserva !== undefined) updateAtm.numero_reserva = str(d.numero_reserva);
    if (d.wbs !== undefined) updateAtm.wbs = str(d.wbs);
    if (d.nf !== undefined) updateAtm.nf = str(d.nf);
    if (d.valor_nf !== undefined) updateAtm.valor_nf = num(d.valor_nf);
    if (d.valor_realizado !== undefined) updateAtm.valor_realizado = num(d.valor_realizado);
    if (d.cotacao_bid !== undefined) updateAtm.cotacao_bid = str(d.cotacao_bid);
    if (d.veiculo !== undefined) updateAtm.veiculo = str(d.veiculo);
    if (d.tipo_frete !== undefined) updateAtm.tipo_frete = str(d.tipo_frete);
    if (d.peso !== undefined) updateAtm.peso = num(d.peso);
    if (d.volume !== undefined) updateAtm.volume = num(d.volume);
    if (d.medidas !== undefined) updateAtm.medidas = str(d.medidas);
    if (d.lista_cargas !== undefined) updateAtm.lista_cargas = d.lista_cargas ? JSON.parse(d.lista_cargas) : null;
    if (d.comprovantes !== undefined) updateAtm.comprovantes = d.comprovantes ? JSON.parse(d.comprovantes) : null;
    if (d.link_rastreio !== undefined) updateAtm.link_rastreio = str(d.link_rastreio);
    if (d.motivo !== undefined) updateAtm.motivo = str(d.motivo);
    if (d.observacoes !== undefined) updateAtm.observacoes = str(d.observacoes);
    if (d.contato_coleta !== undefined) updateAtm.contato_coleta = str(d.contato_coleta);
    if (d.telefone_coleta !== undefined) updateAtm.telefone_coleta = str(d.telefone_coleta);
    if (d.contato_entrega !== undefined) updateAtm.contato_entrega = str(d.contato_entrega);
    if (d.telefone_entrega !== undefined) updateAtm.telefone_entrega = str(d.telefone_entrega);

    // 🟢 ADICIONADO: Verifica explicitamente e salva a data e HORA
    if (d.data_coleta !== undefined) {
      updateAtm.data_coleta = d.data_coleta ? formatarProBanco(d.data_coleta) : "";
    }
    if (d.hora_coleta !== undefined) {
      updateAtm.hora_coleta = str(d.hora_coleta);
    }

    if (d.data_entrega !== undefined) {
      updateAtm.data_entrega = d.data_entrega ? formatarProBanco(d.data_entrega) : "";
    }
    if (d.hora_entrega !== undefined) {
      updateAtm.hora_entrega = str(d.hora_entrega);
    }

    if (d.nome_transportadora !== undefined) {
      if (d.nome_transportadora) {
        try {
          const transp = await withAuth(() => pb.collection('transportadoras').getFirstListItem(pb.filter('nome = {:nome}', { nome: d.nome_transportadora })));
          updateAtm.id_transportadora = transp.id;
        } catch (e) {
          updateAtm.id_transportadora = null;
        }
      } else {
        updateAtm.id_transportadora = null;
      }
    }

    const pedido = await withAuth(() => pb.collection('pedidos_atm').update(id, updateAtm));

    if (pedido.id_origem && d.origem) {
      await withAuth(() => pb.collection('enderecos_pedido').update(pedido.id_origem, {
        logradouro: str(d.origem.logradouro), numero: str(d.origem.numero),
        municipio: str(d.origem.municipio), uf: str(d.origem.uf)
      }));
    }

    if (pedido.id_destino && d.destino) {
      await withAuth(() => pb.collection('enderecos_pedido').update(pedido.id_destino, {
        logradouro: str(d.destino.logradouro), numero: str(d.destino.numero),
        municipio: str(d.destino.municipio), uf: str(d.destino.uf)
      }));
    }

    const fatData = {};
    if (d.tipo_documento !== undefined) fatData.tipo_documento = str(d.tipo_documento);
    if (d.data_mapeamento !== undefined) fatData.data_mapeamento = d.data_mapeamento ? formatarProBanco(d.data_mapeamento) : "";
    if (d.fatura_cte !== undefined) fatData.fatura_cte = str(d.fatura_cte);
    if (d.valor_previsto !== undefined) fatData.valor_previsto = num(d.valor_previsto);
    if (d.data_emissao !== undefined) fatData.data_emissao = d.data_emissao ? formatarProBanco(d.data_emissao) : "";
    if (d.vencimento !== undefined) fatData.vencimento = d.vencimento ? formatarProBanco(d.vencimento) : "";
    if (d.elemento_pep_cc_wbs !== undefined) fatData.elemento_pep_cc_wbs = str(d.elemento_pep_cc_wbs); 
    if (d.validacao_pep !== undefined) fatData.validacao_pep = str(d.validacao_pep);
    if (d.registrado_sap !== undefined) fatData.registrado_sap = str(d.registrado_sap);

    if (Object.keys(fatData).length > 0) {
      let existingFat = null;
      try {
        existingFat = await withAuth(() => pb.collection('faturamento_atm').getFirstListItem(pb.filter('id_atm = {:id}', { id })));
      } catch (e) {}

      if (existingFat) {
        await withAuth(() => pb.collection('faturamento_atm').update(existingFat.id, fatData));
      } else {
        await withAuth(() => pb.collection('faturamento_atm').create({ ...fatData, id_atm: id }));
      }
    }

    req.app.get('io').emit('transportes_atualizados');
    res.json({ mensagem: '✅ Pedido, Endereços e Faturamento atualizados!' });

  } catch (erro) {
    console.error("Erro no Update:", erro);
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarLoteAdmin = async (req, res) => {
  const { ids, dados } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ erro: 'Nenhum ID fornecido para edição em lote.' });
  }

  if (!dados || Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: 'Nenhum dado fornecido para atualizar.' });
  }

  try {
    const updateAtm = {};
    if (dados.status !== undefined) updateAtm.status = str(dados.status);
    if (dados.tipo_operacao !== undefined) updateAtm.tipo_operacao = str(dados.tipo_operacao);
    if (dados.motivo !== undefined) updateAtm.motivo = str(dados.motivo);
    if (dados.solicitacao !== undefined) updateAtm.solicitacao = str(dados.solicitacao);
    if (dados.data_solicitacao !== undefined) updateAtm.data_solicitacao = dados.data_solicitacao ? formatarProBanco(dados.data_solicitacao) : null;
    if (dados.pedido_compra !== undefined) updateAtm.pedido_compra = str(dados.pedido_compra);
    if (dados.numero_reserva !== undefined) updateAtm.numero_reserva = str(dados.numero_reserva);
    if (dados.wbs !== undefined) updateAtm.wbs = str(dados.wbs);
    if (dados.nf !== undefined) updateAtm.nf = str(dados.nf);
    if (dados.valor_nf !== undefined) updateAtm.valor_nf = num(dados.valor_nf);
    if (dados.valor_realizado !== undefined) updateAtm.valor_realizado = num(dados.valor_realizado);
    if (dados.cotacao_bid !== undefined) updateAtm.cotacao_bid = str(dados.cotacao_bid);
    if (dados.veiculo !== undefined) updateAtm.veiculo = str(dados.veiculo);
    if (dados.tipo_frete !== undefined) updateAtm.tipo_frete = str(dados.tipo_frete);
    if (dados.peso !== undefined) updateAtm.peso = num(dados.peso);
    if (dados.volume !== undefined) updateAtm.volume = num(dados.volume);
    if (dados.medidas !== undefined) updateAtm.medidas = str(dados.medidas);
    if (dados.link_rastreio !== undefined) updateAtm.link_rastreio = str(dados.link_rastreio);
    if (dados.observacoes !== undefined) updateAtm.observacoes = str(dados.observacoes);
    if (dados.contato_coleta !== undefined) updateAtm.contato_coleta = str(dados.contato_coleta);
    if (dados.telefone_coleta !== undefined) updateAtm.telefone_coleta = str(dados.telefone_coleta);
    if (dados.contato_entrega !== undefined) updateAtm.contato_entrega = str(dados.contato_entrega);
    if (dados.telefone_entrega !== undefined) updateAtm.telefone_entrega = str(dados.telefone_entrega);

    // 🟢 ADICIONADO PARA LOTE: Capturar a hora também na edição em massa
    if (dados.data_coleta !== undefined) {
      updateAtm.data_coleta = dados.data_coleta ? formatarProBanco(dados.data_coleta) : "";
    }
    if (dados.hora_coleta !== undefined) {
      updateAtm.hora_coleta = str(dados.hora_coleta);
    }

    if (dados.data_entrega !== undefined) {
      updateAtm.data_entrega = dados.data_entrega ? formatarProBanco(dados.data_entrega) : "";
    }
    if (dados.hora_entrega !== undefined) {
      updateAtm.hora_entrega = str(dados.hora_entrega);
    }

    if (dados.nome_transportadora !== undefined) {
      if (dados.nome_transportadora) {
        try {
          const transp = await withAuth(() => pb.collection('transportadoras').getFirstListItem(pb.filter('nome = {:nome}', { nome: dados.nome_transportadora })));
          updateAtm.id_transportadora = transp.id;
        } catch (e) {
          updateAtm.id_transportadora = null;
        }
      } else {
        updateAtm.id_transportadora = null;
      }
    }

    const updateFat = {};
    if (dados.tipo_documento !== undefined) updateFat.tipo_documento = str(dados.tipo_documento);
    if (dados.fatura_cte !== undefined) updateFat.fatura_cte = str(dados.fatura_cte);
    if (dados.data_mapeamento !== undefined) updateFat.data_mapeamento = dados.data_mapeamento ? formatarProBanco(dados.data_mapeamento) : "";
    if (dados.data_emissao !== undefined) updateFat.data_emissao = dados.data_emissao ? formatarProBanco(dados.data_emissao) : "";
    if (dados.vencimento !== undefined) updateFat.vencimento = dados.vencimento ? formatarProBanco(dados.vencimento) : "";
    if (dados.valor_previsto !== undefined) updateFat.valor_previsto = num(dados.valor_previsto); 
    if (dados.validacao_pep !== undefined) updateFat.validacao_pep = str(dados.validacao_pep);
    if (dados.registrado_sap !== undefined) updateFat.registrado_sap = str(dados.registrado_sap);
    if (dados.elemento_pep_cc_wbs !== undefined) updateFat.elemento_pep_cc_wbs = str(dados.elemento_pep_cc_wbs);

    const promessas = ids.map(async (id) => {
      let atm = null;
      try {
        atm = await withAuth(() => pb.collection('pedidos_atm').getOne(id));
      } catch (e) {
        return; 
      }

      if (Object.keys(updateAtm).length > 0) {
        await withAuth(() => pb.collection('pedidos_atm').update(id, updateAtm));
      }

      if (Object.keys(updateFat).length > 0) {
        let existingFat = null;
        try {
          existingFat = await withAuth(() => pb.collection('faturamento_atm').getFirstListItem(pb.filter('id_atm = {:id}', { id })));
        } catch (e) { }

        if (existingFat) {
          await withAuth(() => pb.collection('faturamento_atm').update(existingFat.id, updateFat));
        } else {
          await withAuth(() => pb.collection('faturamento_atm').create({ ...updateFat, id_atm: id }));
        }
      }

      if (dados.origem !== undefined && atm.id_origem) {
        await withAuth(() => pb.collection('enderecos_pedido').update(atm.id_origem, { nome_local: str(dados.origem) }));
      }
      if (dados.destino !== undefined && atm.id_destino) {
        await withAuth(() => pb.collection('enderecos_pedido').update(atm.id_destino, { nome_local: str(dados.destino) }));
      }
    });

    await Promise.all(promessas);

    req.app.get('io').emit('transportes_atualizados');
    res.json({ transatlantic: `✅ Lote de ${ids.length} pedidos atualizado com sucesso!` });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const rastrearPedidoPublico = async (req, res) => {
  const { codigo } = req.params;

  try {
    let pedido = null;
    try {
      pedido = await withAuth(() =>
        pb.collection('pedidos_atm').getFirstListItem(
          pb.filter('numero_atm = {:c} || id = {:c}', { c: codigo }),
          { expand: 'id_origem,id_destino' }
        )
      );
    } catch (e) { }

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    const { expand, ...resto } = pedido;
    const respostaFormatada = {
      ...resto,
      origem: expand?.id_origem || null,
      destino: expand?.id_destino || null
    };

    res.json(respostaFormatada);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = {
  criarTransporte,
  receberWebhookGoogleForms,
  listarTransportesAdmin,
  atualizarTransporteAdmin,
  atualizarLoteAdmin,
  rastrearPedidoPublico
};
