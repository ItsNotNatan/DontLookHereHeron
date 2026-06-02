// src/controllers/transporteController.js
const supabase = require('../config/supabase');
const { formatarProBanco } = require('../utils/formatters');

const criarTransporte = async (req, res) => {
  const dados = req.body;
  
  try {
    // 1. INSERE O LOCAL DE COLETA (Na tabela de Histórico)
    const { data: localColeta, error: erroColeta } = await supabase
      .from('enderecos_pedido') // 🌟 MUDOU AQUI
      .insert([{ 
        nome_local: dados.empresaColeta, 
        municipio: dados.cidadeColeta, 
        uf: dados.ufColeta,
        cep: dados.cepColeta || null,
        logradouro: dados.logradouroColeta || null,
        numero: dados.numeroColeta || null,
        bairro: dados.bairroColeta || null
        // 🌟 REMOVIDO: O campo salvo_pelo_admin já não existe nesta tabela
      }])
      .select('id');
      
    if (erroColeta) throw new Error('Erro Coleta: ' + erroColeta.message);

    // 2. INSERE O LOCAL DE ENTREGA (Na tabela de Histórico)
    const { data: localEntrega, error: erroEntrega } = await supabase
      .from('enderecos_pedido') // 🌟 MUDOU AQUI
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

    const dadosFormatados = data.map(item => ({
      ...item,
      faturamento: item.faturamento && item.faturamento.length > 0 ? item.faturamento[0] : null
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
    const str = (val) => (val === "" || val === undefined ? null : val);

    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos_atm')
      .update({
        status: str(d.status),
        tipo_operacao: str(d.tipo_operacao),
        solicitacao: str(d.solicitacao),
        data_solicitacao: d.data_solicitacao ? formatarProBanco(d.data_solicitacao) : null,
        pedido_compra: str(d.pedido_compra),
        numero_reserva: str(d.numero_reserva),
        wbs: str(d.wbs),
        
        nf: str(d.nf),
        valor_nf: num(d.valor_nf),
        cotacao_bid: str(d.cotacao_bid),
        
        veiculo: str(d.veiculo),
        tipo_frete: str(d.tipo_frete),
        peso: num(d.peso),
        volume: num(d.volume),
        medidas: str(d.medidas),
        lista_cargas: d.lista_cargas ? JSON.parse(d.lista_cargas) : null,
        
        // 🟢 SALVANDO OS ANEXOS NO BANCO:
        comprovantes: d.comprovantes ? JSON.parse(d.comprovantes) : null,
        
        link_rastreio: str(d.link_rastreio),
        motivo: str(d.motivo),
        observacoes: str(d.observacoes),
        
        data_coleta: d.data_coleta ? formatarProBanco(d.data_coleta) : null,
        contato_coleta: str(d.contato_coleta),
        telefone_coleta: str(d.telefone_coleta),
        
        data_entrega: d.data_entrega ? formatarProBanco(d.data_entrega) : null,
        contato_entrega: str(d.contato_entrega),
        telefone_entrega: str(d.telefone_entrega)
      })
      .eq('id', id)
      .select('id_origem, id_destino')
      .single();

    // ... (o restante da função continua igual)

    if (erroPedido) throw new Error('Erro Pedido: ' + erroPedido.message);

    // 🌟 MUDOU AQUI: Atualiza o local de origem no Histórico
    if (pedido.id_origem && d.origem) {
      await supabase.from('enderecos_pedido').update({
        logradouro: str(d.origem.logradouro),
        numero: str(d.origem.numero),
        municipio: str(d.origem.municipio),
        uf: str(d.origem.uf)
      }).eq('id', pedido.id_origem);
    }

    // 🌟 MUDOU AQUI: Atualiza o local de destino no Histórico
    if (pedido.id_destino && d.destino) {
      await supabase.from('enderecos_pedido').update({
        logradouro: str(d.destino.logradouro),
        numero: str(d.destino.numero),
        municipio: str(d.destino.municipio),
        uf: str(d.destino.uf)
      }).eq('id', pedido.id_destino);
    }

    // Atualiza a tabela de faturamento SAP/FI
    const { error: erroFat } = await supabase
      .from('faturamento_atm')
      .upsert({
        id_atm: id,
        tipo_documento: str(d.tipo_documento),
        data_mapeamento: d.data_mapeamento ? formatarProBanco(d.data_mapeamento) : null,
        fatura_cte: str(d.fatura_cte),
        valor: num(d.valor), 
        data_emissao: d.data_emissao ? formatarProBanco(d.data_emissao) : null,
        vencimento: d.vencimento ? formatarProBanco(d.vencimento) : null,
        elemento_pep_cc_wbs: str(d.wbs),
        validacao_pep: str(d.validacao_pep),
        registrado_sap: str(d.registrado_sap)
      }, { onConflict: 'id_atm' });

    if (erroFat) throw new Error('Erro Financeiro: ' + erroFat.message);

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
    if (dados.cotacao_bid !== undefined) updateAtm.cotacao_bid = str(dados.cotacao_bid);
    
    // Carga
    if (dados.veiculo !== undefined) updateAtm.veiculo = str(dados.veiculo);
    if (dados.tipo_frete !== undefined) updateAtm.tipo_frete = str(dados.tipo_frete);
    if (dados.peso !== undefined) updateAtm.peso = num(dados.peso);
    if (dados.volume !== undefined) updateAtm.volume = num(dados.volume);
    if (dados.medidas !== undefined) updateAtm.medidas = str(dados.medidas);
    
    // Logística
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
    if (dados.valor !== undefined) updateFat.valor = num(dados.valor);
    if (dados.validacao_pep !== undefined) updateFat.validacao_pep = str(dados.validacao_pep);
    if (dados.registrado_sap !== undefined) updateFat.registrado_sap = str(dados.registrado_sap);
    if (dados.wbs !== undefined) updateFat.elemento_pep_cc_wbs = str(dados.wbs); // Espelha o WBS no financeiro

    // 3. EXECUTA A ATUALIZAÇÃO PARA CADA ID SELECIONADO
    const promessas = ids.map(async (id) => {
      // Salva dados principais
      if (Object.keys(updateAtm).length > 0) {
        await supabase.from('pedidos_atm').update(updateAtm).eq('id', id);
      }

      // Salva dados financeiros (Upsert cria se não existir)
      if (Object.keys(updateFat).length > 0) {
        const fatParaSalvar = { ...updateFat, id_atm: id };
        await supabase.from('faturamento_atm').upsert(fatParaSalvar, { onConflict: 'id_atm' });
      }

      // Salva Histórico de Endereço (Origem / Destino)
      if (dados.origem !== undefined || dados.destino !== undefined) {
        const { data: atm } = await supabase.from('pedidos_atm').select('id_origem, id_destino').eq('id', id).single();
        
        if (atm) {
          // Atualiza o NOME do local de origem
          if (dados.origem !== undefined && atm.id_origem) {
            await supabase.from('enderecos_pedido').update({ nome_local: str(dados.origem) }).eq('id', atm.id_origem);
          }
          // Atualiza o NOME do local de destino
          if (dados.destino !== undefined && atm.id_destino) {
            await supabase.from('enderecos_pedido').update({ nome_local: str(dados.destino) }).eq('id', atm.id_destino);
          }
        }
      }
    });

    await Promise.all(promessas);

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