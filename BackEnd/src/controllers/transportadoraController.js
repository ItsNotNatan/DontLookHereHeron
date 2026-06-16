// src/controllers/transportadoraController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');

const listarTransportadoras = async (req, res) => {
  try {
    const data = await withAuth(() =>
      pb.collection('transportadoras').getFullList({ filter: 'ativo = true', sort: '+nome' })
    );
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarTransportadora = async (req, res) => {
  try {
    const { nome } = req.body;
    const data = await withAuth(() => pb.collection('transportadoras').create({ nome, ativo: true }));
    res.status(201).json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarTransportadora = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const data = await withAuth(() => pb.collection('transportadoras').update(id, { nome }));
    res.json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirTransportadora = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft delete
    await withAuth(() => pb.collection('transportadoras').update(id, { ativo: false }));
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarTransportadoras, criarTransportadora, atualizarTransportadora, excluirTransportadora };
