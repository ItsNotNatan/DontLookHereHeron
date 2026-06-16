/// <reference path="../pb_data/types.d.ts" />
// =========================================================================
//  ATMLOG - Schema inicial (conversao do Supabase/Postgres para PocketBase)
//  Aplicado automaticamente pelo PocketBase no "serve".
//  API de migrations: PocketBase v0.23+ (new Collection / app.save / fields)
// =========================================================================

migrate((app) => {
  // Helpers de campo -----------------------------------------------------
  const text   = (name, opt = {}) => Object.assign({ type: "text",   name }, opt);
  const number = (name, opt = {}) => Object.assign({ type: "number", name }, opt);
  const bool   = (name, opt = {}) => Object.assign({ type: "bool",   name }, opt);
  const json   = (name, opt = {}) => Object.assign({ type: "json",   name, maxSize: 2000000 }, opt);
  const created = () => ({ type: "autodate", name: "created_at", onCreate: true, onUpdate: false });
  const relation = (name, collectionId, opt = {}) =>
    Object.assign({ type: "relation", name, collectionId, cascadeDelete: false, minSelect: 0, maxSelect: 1, required: false }, opt);

  const make = (def) => {
    const c = new Collection(def);
    app.save(c);
    return c;
  };

  // 1) usuarios ----------------------------------------------------------
  const usuarios = make({
    type: "base",
    name: "usuarios",
    fields: [
      text("nome", { required: true, max: 100 }),
      text("email", { required: true, max: 255 }),
      text("senha", { required: true, max: 255 }),
      text("perfil", { max: 50 }),
      bool("ativo"),
      created(),
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_usuarios_email` ON `usuarios` (`email`)"],
  });

  // 2) transportadoras ---------------------------------------------------
  const transportadoras = make({
    type: "base",
    name: "transportadoras",
    fields: [
      text("nome", { required: true, max: 255 }),
      bool("ativo"),
      created(),
    ],
  });

  // 3) projetos ----------------------------------------------------------
  const projetos = make({
    type: "base",
    name: "projetos",
    fields: [
      text("wbs", { required: true, max: 255 }),
      bool("ativo"),
      created(),
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_projetos_wbs` ON `projetos` (`wbs`)"],
  });

  // 4) veiculos ----------------------------------------------------------
  make({
    type: "base",
    name: "veiculos",
    fields: [
      text("nome", { required: true, max: 100 }),
      number("comprimento", { required: true }),
      number("largura", { required: true }),
      number("altura", { required: true }),
      bool("ativo"),
      created(),
    ],
  });

  // 5) motivos -----------------------------------------------------------
  make({
    type: "base",
    name: "motivos",
    fields: [
      text("nome", { required: true, max: 100 }),
      text("descricao", { max: 5000 }),
      text("cor", { max: 20 }),
      created(),
    ],
  });

  // 6) locais_base (agenda do admin) ------------------------------------
  make({
    type: "base",
    name: "locais_base",
    fields: [
      text("nome_local", { required: true, max: 255 }),
      text("logradouro", { max: 255 }),
      text("numero", { max: 50 }),
      text("bairro", { max: 100 }),
      text("municipio", { max: 150 }),
      text("uf", { max: 2 }),
      text("cep", { max: 20 }),
      bool("ativo"),
      created(),
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_locais_nome_cep` ON `locais_base` (`nome_local`, `cep`)"],
  });

  // 7) enderecos_pedido (historico / fotografia do endereco) ------------
  const enderecos = make({
    type: "base",
    name: "enderecos_pedido",
    fields: [
      text("nome_local", { required: true, max: 255 }),
      text("logradouro", { max: 255 }),
      text("numero", { max: 50 }),
      text("bairro", { max: 100 }),
      text("municipio", { max: 150 }),
      text("uf", { max: 2 }),
      text("cep", { max: 20 }),
      created(),
    ],
  });

  // 8) refresh_tokens ----------------------------------------------------
  make({
    type: "base",
    name: "refresh_tokens",
    fields: [
      relation("usuario_id", usuarios.id, { required: true, cascadeDelete: true }),
      text("token", { required: true, max: 1000 }),
      text("expira_em", { max: 50 }),
      created(),
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_refresh_token` ON `refresh_tokens` (`token`)"],
  });

  // 9) pedidos_atm (principal) ------------------------------------------
  const pedidos = make({
    type: "base",
    name: "pedidos_atm",
    fields: [
      text("numero_atm", { max: 50 }),
      text("tipo_operacao", { max: 50 }),
      text("data_solicitacao", { max: 30 }),
      text("data_coleta", { max: 30 }),
      text("pedido_compra", { max: 100 }),
      text("nf", { max: 100 }),
      text("wbs", { max: 255 }),
      text("contato_coleta", { max: 255 }),
      text("telefone_coleta", { max: 50 }),
      text("contato_entrega", { max: 255 }),
      text("telefone_entrega", { max: 50 }),
      text("numero_reserva", { max: 100 }),
      relation("id_origem", enderecos.id),
      relation("id_destino", enderecos.id),
      json("lista_cargas"),
      number("quantidade_volumes"),
      number("peso"),
      number("volume"),
      text("medidas", { max: 255 }),
      text("tipo_frete", { max: 50 }),
      text("solicitacao", { max: 100 }),
      relation("id_transportadora", transportadoras.id),
      text("veiculo", { max: 100 }),
      text("cotacao_bid", { max: 50 }),
      number("valor_nf"),
      number("valor_realizado"),
      text("data_entrega", { max: 30 }),
      text("status", { max: 50 }),
      text("observacoes", { max: 5000 }),
      text("link_rastreio", { max: 500 }),
      text("motivo", { max: 100 }),
      json("comprovantes"),
      created(),
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_pedidos_numero_atm` ON `pedidos_atm` (`numero_atm`) WHERE `numero_atm` != ''"],
  });

  // 10) faturamento_atm (SAP / CTE / FI) --------------------------------
  make({
    type: "base",
    name: "faturamento_atm",
    fields: [
      relation("id_atm", pedidos.id, { cascadeDelete: true }),
      number("valor_bid_dedicado"),
      number("valor_bid"),
      text("tipo_documento", { max: 50 }),
      text("data_mapeamento", { max: 30 }),
      text("fatura_cte", { max: 100 }),
      number("valor_previsto"),
      text("data_emissao", { max: 30 }),
      text("vencimento", { max: 30 }),
      text("elemento_pep_cc_wbs", { max: 100 }),
      text("validacao_pep", { max: 50 }),
      text("registrado_sap", { max: 10 }),
      text("registro_sap", { max: 100 }),
      text("lancamento_fi", { max: 10 }),
      text("processo_lancamento_fi", { max: 100 }),
      created(),
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_faturamento_id_atm` ON `faturamento_atm` (`id_atm`)"],
  });

  // 11) atms_externos_temp (formularios externos / Google Forms) --------
  make({
    type: "base",
    name: "atms_externos_temp",
    fields: [
      text("solicitante", { max: 255 }),
      text("data_solicitacao", { max: 30 }),
      text("tipo_operacao", { max: 50 }),
      text("pedido_compra", { max: 255 }),
      text("nf", { max: 255 }),
      text("wbs", { max: 255 }),
      text("empresa_coleta", { max: 255 }),
      text("contato_coleta", { max: 255 }),
      text("telefone_coleta", { max: 50 }),
      text("data_coleta", { max: 30 }),
      text("cep_coleta", { max: 20 }),
      text("logradouro_coleta", { max: 255 }),
      text("numero_coleta", { max: 50 }),
      text("bairro_coleta", { max: 100 }),
      text("cidade_coleta", { max: 150 }),
      text("uf_coleta", { max: 2 }),
      text("empresa_entrega", { max: 255 }),
      text("contato_entrega", { max: 255 }),
      text("telefone_entrega", { max: 50 }),
      text("data_entrega", { max: 30 }),
      text("cep_entrega", { max: 20 }),
      text("logradouro_entrega", { max: 255 }),
      text("numero_entrega", { max: 50 }),
      text("bairro_entrega", { max: 100 }),
      text("cidade_entrega", { max: 150 }),
      text("uf_entrega", { max: 2 }),
      json("lista_cargas"),
      number("quantidade_volumes"),
      number("peso"),
      number("volume"),
      text("medidas", { max: 255 }),
      text("veiculo_sugerido", { max: 255 }),
      text("tipo_frete", { max: 100 }),
      text("observacoes", { max: 5000 }),
      bool("processado"),
      created(),
    ],
  });
}, (app) => {
  // ---- DOWN: remove na ordem inversa (dependentes primeiro) ----
  const names = [
    "atms_externos_temp",
    "faturamento_atm",
    "pedidos_atm",
    "refresh_tokens",
    "enderecos_pedido",
    "locais_base",
    "motivos",
    "veiculos",
    "projetos",
    "transportadoras",
    "usuarios",
  ];
  for (const n of names) {
    try { app.delete(app.findCollectionByNameOrId(n)); } catch (e) { /* ja removida */ }
  }
});
