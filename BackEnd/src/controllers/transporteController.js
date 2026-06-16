// src/controllers/transporteController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');
const { formatarProBanco } = require('../utils/formatters');

const num = (val) => (val === '' || val === undefined || val === null ? null : parseFloat(val));
const str = (val) => (val === '' || val === undefined || val === null ? null : String(val));

// Resolve o nome de uma transportadora para o id (relation). Retorna undefined se nao achar.
async function idTransportadoraPorNome(nome) {
  if (!nome) return null; // limpa relacao
  try {
    const t = await withAuth(() =>
      pb.collection('transportadoras').getFirstListItem(pb.filter('nome = {:n}', { n: nome }))
    );
    return t.id;
  } catch (e) {
    return undefined; // nao encontrada -> nao altera
  }
}

const criarTransporte = async (req, res) => {
  const dados = req.body;
  try {
    const localColeta = await withAuth(() => pb.collection('enderecos_pedido').create({
      nome_local: dados.empresaColeta || '',
      municipio: dados.cidadeColeta || '',
      uf: dados.ufColeta || '',
      cep: dados.cepColeta || '',
      logradouro: dados.logradouroColeta || '',
      numero: dados.numeroColeta || '',
      bairro: dados.bairroColeta || '',
    }));

    const localEntrega = await withAuth(() => pb.collection('enderecos_pedido').create({
      nome_local: dados.empresaEntrega || 'Destinatario',
      municipio: dados.cidadeEntrega || '',
      uf: dados.ufEntrega || '',
      cep: dados.cepEntrega || '',
      logradouro: dados.logradouroEntrega || '',
      numero: dados.numeroEntrega || '',
      bairro: dados.bairroEntrega || '',
    }));

    const pedido = await withAuth(() => pb.collection('pedidos_atm').create({
      data_solicitacao: formatarProBanco(dados.dataSolicitacao),
      tipo_operacao: dados.tipo_operacao,
      pedido_compra: dados.pedidoCompra,
      nf: dados.nf || '',
      valor_nf: dados.valor_nf ? parseFloat(dados.valor_nf) : null,
      wbs: dados.wbs,
      contato_coleta: dados.nomeContatoColeta || '',
      telefone_coleta: dados.telefoneColeta || '',
      contato_entrega: dados.nomeContatoEntrega || '',
      telefone_entrega: dados.telefoneEntrega || '',
      numero_reserva: dados.numeroReserva || '',
      id_origem: localColeta.id,
      id_destino: localEntrega.id,
      tipo_frete: dados.frete,
      solicitacao: dados.solicitante,
      veiculo: dados.veiculo,
      lista_cargas: dados.listaCargas ? JSON.parse(dados.listaCargas) : null,
      quantidade_volumes: parseInt(dados.quantidadeVolumes) || 0,
      peso: parseFloat(dados.pesoTotal) || 0,
      volume: 0,
      data_entrega: formatarProBanco(dados.dataEntrega),
      status: 'Aguardando Aprovação',
      observacoes: dados.obs || '',
    }));

    res.status(201).json({ mensagem: 'Sucesso!', id_gerado: pedido.id });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const listarTransportesAdmin = async (req, res) => {
  try {
    const pedidos = await withAuth(() =>
      pb.collection('pedidos_atm').getFullList({
        sort: '-created_at',
        expand: 'id_origem,id_destino,id_transportadora',
      })
    );

    const faturamentos = await withAuth(() => pb.collection('faturamento_atm').getFullList());
    const fatMap = {};
    for (const f of faturamentos) fatMap[f.id_atm] = f;

    const dados = pedidos.map((p) => ({
      ...p,
      origem: (p.expand && p.expand.id_origem) || null,
      destino: (p.expand && p.expand.id_destino) || null,
      transportadora: (p.expand && p.expand.id_transportadora) || null,
      faturamento: fatMap[p.id] || null,
    }));

    res.json(dados);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const atualizarTransporteAdmin = async (req, res) => {
  const { id } = req.params;
  const d = req.body;

  try {
    // 1. Tabela principal
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
    if (d.data_coleta !== undefined) updateAtm.data_coleta = d.data_coleta ? formatarProBanco(d.data_coleta) : null;
    if (d.contato_coleta !== undefined) updateAtm.contato_coleta = str(d.contato_coleta);
    if (d.telefone_coleta !== undefined) updateAtm.telefone_coleta = str(d.telefone_coleta);
    if (d.data_entrega !== undefined) updateAtm.data_entrega = d.data_entrega ? formatarProBanco(d.data_entrega) : null;
    if (d.contato_entrega !== undefined) updateAtm.contato_entrega = str(d.contato_entrega);
    if (d.telefone_entrega !== undefined) updateAtm.telefone_entrega = str(d.telefone_entrega);

    // Transportadora por nome -> id (melhoria: faz o campo do form realmente salvar)
    if (d.nome_transportadora !== undefined) {
      const tid = await idTransportadoraPorNome(str(d.nome_transportadora));
      if (tid !== undefined) updateAtm.id_transportadora = tid || '';
    }

    const pedido = await withAuth(() => pb.collection('pedidos_atm').getOne(id));
    if (Object.keys(updateAtm).length > 0) {
      await withAuth(() => pb.collection('pedidos_atm').update(id, updateAtm));
    }

    // 2. Enderecos (origem/destino)
    if (pedido.id_origem && d.origem) {
      await withAuth(() => pb.collection('enderecos_pedido').update(pedido.id_origem, {
        logradouro: str(d.origem.logradouro),
        numero: str(d.origem.numero),
        municipio: str(d.origem.municipio),
        uf: str(d.origem.uf),
      }));
    }
    if (pedido.id_destino && d.destino) {
      await withAuth(() => pb.collection('enderecos_pedido').update(pedido.id_destino, {
        logradouro: str(d.destino.logradouro),
        numero: str(d.destino.numero),
        municipio: str(d.destino.municipio),
        uf: str(d.destino.uf),
      }));
    }

    // 3. Faturamento (upsert)
    const fatData = {};
    if (d.tipo_documento !== undefined) fatData.tipo_documento = str(d.tipo_documento);
    if (d.data_mapeamento !== undefined) fatData.data_mapeamento = d.data_mapeamento ? formatarProBanco(d.data_mapeamento) : null;
    if (d.fatura_cte !== undefined) fatData.fatura_cte = str(d.fatura_cte);
    if (d.valor_previsto !== undefined) fatData.valor_previsto = num(d.valor_previsto);
    if (d.data_emissao !== undefined) fatData.data_emissao = d.data_emissao ? formatarProBanco(d.data_emissao) : null;
    if (d.vencimento !== undefined) fatData.vencimento = d.vencimento ? formatarProBanco(d.vencimento) : null;
    if (d.wbs !== undefined) fatData.elemento_pep_cc_wbs = str(d.wbs);
    if (d.validacao_pep !== undefined) fatData.validacao_pep = str(d.validacao_pep);
    if (d.registrado_sap !== undefined) fatData.registrado_sap = str(d.registrado_sap);

    if (Object.keys(fatData).length > 0) {
      let existingFat = null;
      try {
        existingFat = await withAuth(() =>
          pb.collection('faturamento_atm').getFirstListItem(pb.filter('id_atm = {:a}', { a: id }))
        );
      } catch (e) { existingFat = null; }

      if (existingFat) {
        await withAuth(() => pb.collection('faturamento_atm').update(existingFat.id, fatData));
      } else {
        await withAuth(() => pb.collection('faturamento_atm').create({ ...fatData, id_atm: id }));
      }
    }

    res.json({ mensagem: '✅ Pedido, Enderecos e Faturamento atualizados!' });
  } catch (erro) {
    console.error('Erro completo no Update:', erro);
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarLoteAdmin = async (req, res) => {
  const { ids, dados } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ erro: 'Nenhum ID fornecido para edicao em lote.' });
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
    if (dados.data_solicitacao !== undefined) updateAtm.data_solicitacao = formatarProBanco(dados.data_solicitacao);
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
    if (dados.data_coleta !== undefined) updateAtm.data_coleta = formatarProBanco(dados.data_coleta);
    if (dados.contato_coleta !== undefined) updateAtm.contato_coleta = str(dados.contato_coleta);
    if (dados.telefone_coleta !== undefined) updateAtm.telefone_coleta = str(dados.telefone_coleta);
    if (dados.data_entrega !== undefined) updateAtm.data_entrega = formatarProBanco(dados.data_entrega);
    if (dados.contato_entrega !== undefined) updateAtm.contato_entrega = str(dados.contato_entrega);
    if (dados.telefone_entrega !== undefined) updateAtm.telefone_entrega = str(dados.telefone_entrega);

    if (dados.nome_transportadora !== undefined || dados.transportadora !== undefined) {
      const nome = str(dados.nome_transportadora !== undefined ? dados.nome_transportadora : dados.transportadora);
      const tid = await idTransportadoraPorNome(nome);
      if (tid !== undefined) updateAtm.id_transportadora = tid || '';
    }

    const updateFat = {};
    if (dados.tipo_documento !== undefined) updateFat.tipo_documento = str(dados.tipo_documento);
    if (dados.fatura_cte !== undefined) updateFat.fatura_cte = str(dados.fatura_cte);
    if (dados.data_mapeamento !== undefined) updateFat.data_mapeamento = formatarProBanco(dados.data_mapeamento);
    if (dados.data_emissao !== undefined) updateFat.data_emissao = formatarProBanco(dados.data_emissao);
    if (dados.vencimento !== undefined) updateFat.vencimento = formatarProBanco(dados.vencimento);
    if (dados.valor_previsto !== undefined) updateFat.valor_previsto = num(dados.valor_previsto);
    if (dados.validacao_pep !== undefined) updateFat.validacao_pep = str(dados.validacao_pep);
    if (dados.registrado_sap !== undefined) updateFat.registrado_sap = str(dados.registrado_sap);
    if (dados.wbs !== undefined) updateFat.elemento_pep_cc_wbs = str(dados.wbs);

    for (const id of ids) {
      if (Object.keys(updateAtm).length > 0) {
        await withAuth(() => pb.collection('pedidos_atm').update(id, updateAtm));
      }
      if (Object.keys(updateFat).length > 0) {
        let ex = null;
        try { ex = await withAuth(() => pb.collection('faturamento_atm').getFirstListItem(pb.filter('id_atm = {:a}', { a: id }))); } catch (e) { ex = null; }
        if (ex) await withAuth(() => pb.collection('faturamento_atm').update(ex.id, updateFat));
        else await withAuth(() => pb.collection('faturamento_atm').create({ ...updateFat, id_atm: id }));
      }
      if (dados.origem !== undefined || dados.destino !== undefined) {
        const atm = await withAuth(() => pb.collection('pedidos_atm').getOne(id));
        if (dados.origem !== undefined && atm.id_origem) {
          await withAuth(() => pb.collection('enderecos_pedido').update(atm.id_origem, { nome_local: str(dados.origem) }));
        }
        if (dados.destino !== undefined && atm.id_destino) {
          await withAuth(() => pb.collection('enderecos_pedido').update(atm.id_destino, { nome_local: str(dados.destino) }));
        }
      }
    }

    res.json({ mensagem: `✅ Lote de ${ids.length} pedidos atualizado com sucesso!` });
  } catch (erro) {
    console.error('Erro na edicao em lote:', erro);
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
    } catch (e) { pedido = null; }

    if (!pedido) return res.status(404).json({ erro: 'Pedido nao encontrado.' });

    const out = {
      ...pedido,
      origem: (pedido.expand && pedido.expand.id_origem) || null,
      destino: (pedido.expand && pedido.expand.id_destino) || null,
    };
    res.json(out);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = {
  criarTransporte,
  listarTransportesAdmin,
  atualizarTransporteAdmin,
  atualizarLoteAdmin,
  rastrearPedidoPublico,
};
