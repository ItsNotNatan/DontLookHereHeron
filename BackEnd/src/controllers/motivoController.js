// src/controllers/motivoController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');

const listarMotivos = async (req, res) => {
  try {
    const data = await withAuth(() => pb.collection('motivos').getFullList({ sort: '+nome' }));
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarMotivo = async (req, res) => {
  try {
    const { nome, descricao, cor } = req.body;
    const data = await withAuth(() => pb.collection('motivos').create({ nome, descricao: descricao || '', cor: cor || '#ef4444' }));
    res.status(201).json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarMotivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, cor } = req.body;
    const data = await withAuth(() => pb.collection('motivos').update(id, { nome, descricao, cor }));
    res.json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirMotivo = async (req, res) => {
  try {
    const { id } = req.params;
    await withAuth(() => pb.collection('motivos').delete(id));
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarMotivos, criarMotivo, atualizarMotivo, excluirMotivo };
