/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const text   = (name, opt = {}) => Object.assign({ type: "text",   name }, opt);
  const number = (name, opt = {}) => Object.assign({ type: "number", name }, opt);
  const created = () => ({ type: "autodate", name: "created_at", onCreate: true, onUpdate: false });
  
  const c = new Collection({
    type: "base",
    name: "auditoria_seguros",
    fields: [
      text("periodo", { required: true, max: 30 }),
      text("transportadora", { required: true, max: 255 }),
      text("atm", { required: true, max: 100 }),
      text("data_frete", { max: 30 }),
      number("valor_carga"),
      number("valor_seguro"),
      text("data_solicitacao", { max: 30 }),
      text("data_recebimento", { max: 30 }),
      text("resultado", { max: 50 }),
      text("tipo_documento", { max: 100 }),
      text("referencia", { max: 255 }),
      text("documento_link", { max: 500 }),
      text("anexo_data"), 
      text("anexo_nome", { max: 255 }),
      text("anexo_tipo", { max: 100 }),
      text("responsavel", { max: 255 }),
      text("observacoes", { max: 5000 }),
      created(),
    ]
  });
  
  app.save(c);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("auditoria_seguros")); } catch (e) {}
});
