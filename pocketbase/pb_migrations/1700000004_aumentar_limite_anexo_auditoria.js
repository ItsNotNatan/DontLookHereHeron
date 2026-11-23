migrate((app) => {
  const collection = app.findCollectionByNameOrId('auditoria_seguros');

  if (!collection) {
    throw new Error('A coleção auditoria_seguros não foi encontrada.');
  }

  const campoAnexo = collection.fields.getByName('anexo_data');

  if (!campoAnexo) {
    throw new Error('O campo anexo_data não foi encontrado na coleção auditoria_seguros.');
  }

  campoAnexo.max = 7000000;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('auditoria_seguros');

  if (!collection) {
    return;
  }

  const campoAnexo = collection.fields.getByName('anexo_data');

  if (campoAnexo) {
    campoAnexo.max = 5000;
    return app.save(collection);
  }
});
