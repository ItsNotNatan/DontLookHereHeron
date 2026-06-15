// src/controllers/transporteController.js
const supabase = require('../config/supabase');
const { formatarProBanco } = require('../utils/formatters');

const criarTransporte = async (req, res) => {
  const dados = req.body;

  try {
    // 1. INSERE O LOCAL DE COLETA (Na tabela de Histórico)
    const { data: localColeta, error: erroColeta } = await supabase
      .from('enderecos_pedido')
      .insert([{
        nome_local: dados.empresaColeta,
        municipio: dados.cidadeColeta,
        uf: dados.ufColeta,
        cep: dados.cepColeta || null,
        logradouro: dados.logradouroColeta || null,
        numero: dados.numeroColeta || null,
        bairro: dados.bairroColeta || null
      }])
      .select('id');

    if (erroColeta) throw new Error('Erro Coleta: ' + erroColeta.message);

    // 2. INSERE O LOCAL DE ENTREGA (Na tabela de Histórico)
    const { data: localEntrega, error: erroEntrega } = await supabase
      .from('enderecos_pedido')
      .insert([{
        nome_local: dados.empresaEntrega || 'Destinatário',
        municipio: dados.cidadeEntrega,
        uf: dados.ufEntrega,
        cep: dados.cepEntrega || null,
        logradouro: dados.logradouroEntrega || null,
        numero: dados.numeroEntrega || null,
        bairro: dados.bairroEntrega || null
      }])
      .select('id');

    if (erroEntrega) throw new Error('Erro Entrega: ' + erroEntrega.message);

    // 3. INSERE O PEDIDO ATM
    const { data: pedidoAtm, error: erroAtm } = await supabase
      .from('pedidos_atm')
      .insert([{
        data_solicitacao: formatarProBanco(dados.dataSolicitacao),
        tipo_operacao: dados.tipo_operacao,
        pedido_compra: dados.pedidoCompra,
        nf: dados.nf || null,
        valor_nf: dados.valor_nf ? parseFloat(dados.valor_nf) : null,
        wbs: dados.wbs,

        contato_coleta: dados.nomeContatoColeta || null,
        telefone_coleta: dados.telefoneColeta || null,
        contato_entrega: dados.nomeContatoEntrega || null,
        telefone_entrega: dados.telefoneEntrega || null,
        numero_reserva: dados.numeroReserva || null,

        id_origem: localColeta[0].id,
        id_destino: localEntrega[0].id,
        tipo_frete: dados.frete,
        solicitacao: dados.solicitante,
        veiculo: dados.veiculo,

        lista_cargas: dados.listaCargas ? JSON.parse(dados.listaCargas) : null,
        quantidade_volumes: parseInt(dados.quantidadeVolumes) || 0,
        peso: parseFloat(dados.pesoTotal) || 0,
        volume: 0,

        data_entrega: formatarProBanco(dados.dataEntrega),
        status: 'Aguardando Aprovação',
        observacoes: dados.obs || null
      }])
      .select('id');

    if (erroAtm) throw new Error('Erro ATM: ' + erroAtm.message);

    // 🟢 AVISA O FRONT-END QUE UM NOVO PEDIDO FOI CRIADO!
    req.app.get('io').emit('transportes_atualizados');

    res.status(201).json({ mensagem: 'Sucesso!', id_gerado: pedidoAtm[0].id });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const listarTransportesAdmin = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos_atm')
      .select(`
        *,
        origem:id_origem (nome_local, logradouro, numero, bairro, municipio, uf, cep),
        destino:id_destino (nome_local, logradouro, numero, bairro, municipio, uf, cep),
        transportadora:id_transportadora (nome),
        faturamento:faturamento_atm (*) 
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // 🟢 CORREÇÃO: Trata a formatação corretamente quer o Supabase devolva um Array ou um Objeto
    const dadosFormatados = data.map(item => ({
      ...item,
      faturamento: Array.isArray(item.faturamento) ? item.faturamento[0] : (item.faturamento || null)
    }));

    res.json(dadosFormatados);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const atualizarTransporteAdmin = async (req, res) => {
  const { id } = req.params;
  const d = req.body;

  try {
    const num = (val) => (val === "" || val === undefined || val === null ? null : parseFloat(val));
    const str = (val) => (val === "" || val === undefined || val === null ? null : String(val));

    // 1. ATUALIZAR TABELA PRINCIPAL (Somente o que for enviado)
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

    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos_atm')
      .update(updateAtm)
      .eq('id', id)
      .select('id_origem, id_destino')
      .single();

    if (erroPedido) throw new Error('Erro Pedido: ' + erroPedido.message);

    // 2. ATUALIZAR ENDEREÇOS
    if (pedido.id_origem && d.origem) {
      await supabase.from('enderecos_pedido').update({
        logradouro: str(d.origem.logradouro),
        numero: str(d.origem.numero),
        municipio: str(d.origem.municipio),
        uf: str(d.origem.uf)
      }).eq('id', pedido.id_origem);
    }

    if (pedido.id_destino && d.destino) {
      await supabase.from('enderecos_pedido').update({
        logradouro: str(d.destino.logradouro),
        numero: str(d.destino.numero),
        municipio: str(d.destino.municipio),
        uf: str(d.destino.uf)
      }).eq('id', pedido.id_destino);
    }

    // 3. 🟢 ATUALIZAR FATURAMENTO COM O NOVO NOME (valor_previsto)
    const fatData = {};
    if (d.tipo_documento !== undefined) fatData.tipo_documento = str(d.tipo_documento);
    if (d.data_mapeamento !== undefined) fatData.data_mapeamento = d.data_mapeamento ? formatarProBanco(d.data_mapeamento) : null;
    if (d.fatura_cte !== undefined) fatData.fatura_cte = str(d.fatura_cte);

    if (d.valor_previsto !== undefined) fatData.valor_previsto = num(d.valor_previsto); // 🟢 O NOME NOVO

    if (d.data_emissao !== undefined) fatData.data_emissao = d.data_emissao ? formatarProBanco(d.data_emissao) : null;
    if (d.vencimento !== undefined) fatData.vencimento = d.vencimento ? formatarProBanco(d.vencimento) : null;
    if (d.wbs !== undefined) fatData.elemento_pep_cc_wbs = str(d.wbs);
    if (d.validacao_pep !== undefined) fatData.validacao_pep = str(d.validacao_pep);
    if (d.registrado_sap !== undefined) fatData.registrado_sap = str(d.registrado_sap);

    if (Object.keys(fatData).length > 0) {
      // 🟢 CORREÇÃO: Usar .maybeSingle() em vez de .single()
      const { data: existingFat } = await supabase.from('faturamento_atm').select('id').eq('id_atm', id).maybeSingle();

      if (existingFat) {
        // Se já existe, atualiza
        const { error: erroFat } = await supabase.from('faturamento_atm').update(fatData).eq('id_atm', id);
        if (erroFat) throw new Error('Erro Financeiro Update: ' + erroFat.message);
      } else {
        // Se não existe, cria
        const { error: erroFat } = await supabase.from('faturamento_atm').insert([{ ...fatData, id_atm: id }]);
        if (erroFat) throw new Error('Erro Financeiro Insert: ' + erroFat.message);
      }
    }

    // 🟢 AVISA O FRONT-END QUE UM PEDIDO FOI ATUALIZADO!
    req.app.get('io').emit('transportes_atualizados');

    res.json({ mensagem: '✅ Pedido, Endereços e Faturamento atualizados!' });

  } catch (erro) {
    console.error("Erro completo no Update:", erro);
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
    const num = (val) => (val === "" || val === undefined || val === null ? null : parseFloat(val));
    const str = (val) => (val === "" || val === undefined ? null : val);

    // 1. SEPARA OS DADOS QUE VÃO PARA A TABELA 'pedidos_atm'
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

    // 2. SEPARA OS DADOS QUE VÃO PARA A TABELA 'faturamento_atm'
    const updateFat = {};
    if (dados.tipo_documento !== undefined) updateFat.tipo_documento = str(dados.tipo_documento);
    if (dados.fatura_cte !== undefined) updateFat.fatura_cte = str(dados.fatura_cte);
    if (dados.data_mapeamento !== undefined) updateFat.data_mapeamento = formatarProBanco(dados.data_mapeamento);
    if (dados.data_emissao !== undefined) updateFat.data_emissao = formatarProBanco(dados.data_emissao);
    if (dados.vencimento !== undefined) updateFat.vencimento = formatarProBanco(dados.vencimento);

    if (dados.valor_previsto !== undefined) updateFat.valor_previsto = num(dados.valor_previsto); // 🟢 O NOME NOVO NO LOTE

    if (dados.validacao_pep !== undefined) updateFat.validacao_pep = str(dados.validacao_pep);
    if (dados.registrado_sap !== undefined) updateFat.registrado_sap = str(dados.registrado_sap);
    if (dados.wbs !== undefined) updateFat.elemento_pep_cc_wbs = str(dados.wbs);

    // 3. EXECUTA A ATUALIZAÇÃO PARA CADA ID SELECIONADO
    const promessas = ids.map(async (id) => {
      if (Object.keys(updateAtm).length > 0) {
        await supabase.from('pedidos_atm').update(updateAtm).eq('id', id);
      }

      if (Object.keys(updateFat).length > 0) {
        // 🟢 CORREÇÃO: Usar .maybeSingle() também na edição em lote
        const { data: existingFat } = await supabase.from('faturamento_atm').select('id').eq('id_atm', id).maybeSingle();

        if (existingFat) {
          await supabase.from('faturamento_atm').update(updateFat).eq('id_atm', id);
        } else {
          await supabase.from('faturamento_atm').insert([{ ...updateFat, id_atm: id }]);
        }
      }

      if (dados.origem !== undefined || dados.destino !== undefined) {
        const { data: atm } = await supabase.from('pedidos_atm').select('id_origem, id_destino').eq('id', id).single();
        if (atm) {
          if (dados.origem !== undefined && atm.id_origem) {
            await supabase.from('enderecos_pedido').update({ nome_local: str(dados.origem) }).eq('id', atm.id_origem);
          }
          if (dados.destino !== undefined && atm.id_destino) {
            await supabase.from('enderecos_pedido').update({ nome_local: str(dados.destino) }).eq('id', atm.id_destino);
          }
        }
      }
    });

    await Promise.all(promessas);

    // 🟢 AVISA O FRONT-END QUE UM LOTE DE PEDIDOS FOI ATUALIZADO!
    req.app.get('io').emit('transportes_atualizados');

    res.json({ mensagem: `✅ Lote de ${ids.length} pedidos atualizado com sucesso!` });

  } catch (erro) {
    console.error("Erro na edição em lote:", erro);
    res.status(500).json({ erro: erro.message });
  }
};

const rastrearPedidoPublico = async (req, res) => {
  const { codigo } = req.params;

  try {
    const { data, error } = await supabase
      .from('pedidos_atm')
      .select(`
        *,
        origem:id_origem (nome_local, municipio, uf),
        destino:id_destino (nome_local, municipio, uf)
      `)
      .or(`numero_atm.eq.${codigo},id.ilike.${codigo}%`)
      .single();

    if (error || !data) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = {
  criarTransporte,
  listarTransportesAdmin,
  atualizarTransporteAdmin,
  atualizarLoteAdmin,
  rastrearPedidoPublico
};