// src/controllers/projetoController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');

const listarProjetos = async (req, res) => {
  try {
    const data = await withAuth(() => pb.collection('projetos').getFullList({ sort: '-created_at' }));
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarProjeto = async (req, res) => {
  try {
    const { descricao } = req.body;
    const data = await withAuth(() => pb.collection('projetos').create({ wbs: descricao, ativo: true }));
    res.status(201).json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarProjeto = async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;
    const data = await withAuth(() => pb.collection('projetos').update(id, { wbs: descricao }));
    res.json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirProjeto = async (req, res) => {
  try {
    const { id } = req.params;
    await withAuth(() => pb.collection('projetos').delete(id));
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarProjetos, criarProjeto, atualizarProjeto, excluirProjeto };
