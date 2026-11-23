/// <reference path="../pb_data/types.d.ts" />

// Coleções persistentes do módulo Controle SLA.
migrate((app) => {
  const text = (name, opt = {}) => Object.assign({ type: 'text', name }, opt);
  const number = (name, opt = {}) => Object.assign({ type: 'number', name }, opt);
  const json = (name, opt = {}) => Object.assign({ type: 'json', name, maxSize: 1000000 }, opt);

  const registros = new Collection({
    type: 'base',
    name: 'controle_sla_registros',
    fields: [
      text('client_id', { max: 160 }),
      text('modalidade', { required: true, max: 30 }),
      text('data', { required: true, max: 30 }),
      text('transportadora', { required: true, max: 255 }),
      text('processo', { required: true, max: 255 }),
      number('frete'),
      text('evento', { max: 500 }),
      text('penalidade', { max: 80 }),
      text('observacao', { max: 5000 }),
      json('indicadores_ocorrencia'),
      json('indicadores_nao_conformes'),
      json('indicadores_ok'),
      text('tipo_ocorrencia', { max: 500 }),
      text('viagem', { max: 255 }),
      number('pontuacao'),
      number('desconto'),
      number('frete_liquido'),
      text('criado_em', { max: 50 }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_controle_sla_client_id` ON `controle_sla_registros` (`client_id`) WHERE `client_id` != ''",
    ],
  });
  app.save(registros);

  const transportadoras = new Collection({
    type: 'base',
    name: 'controle_sla_transportadoras',
    fields: [
      text('nome', { required: true, max: 255 }),
      text('nome_normalizado', { required: true, max: 255 }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_controle_sla_transportadoras_nome` ON `controle_sla_transportadoras` (`nome_normalizado`)",
    ],
  });
  app.save(transportadoras);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('controle_sla_transportadoras')); } catch (erro) {}
  try { app.delete(app.findCollectionByNameOrId('controle_sla_registros')); } catch (erro) {}
});
